// src/vscode/webview/WebviewProvider.ts
import * as vscode from 'vscode';
import { getReactHtmlContent } from './htmlTemplate';
import { ApplicationLogicService } from '../../core/ApplicationLogicService';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import { EventType, WindsurfEvent, ToolExecutionEventPayload, SystemEventPayload, ErrorOccurredEventPayload } from '../../features/events/eventTypes';
import * as crypto from 'crypto';

export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];
  private currentChatId: string | null = null;
  private currentOperationId: string | null = null; // Para rastrear la operación actual iniciada por el usuario
  private dispatcherSubscriptions: { unsubscribe: () => void }[] = [];
  private testModeEnabled: boolean = false;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly appLogicService: ApplicationLogicService,
    private readonly internalEventDispatcher: InternalEventDispatcher
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    this.setupWebview();
    this.setupMessageHandling();
    this.subscribeToInternalEvents();
  }

  private setupWebview(): void {
    if (!this.view) return;

    this.view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    this.view.webview.html = getReactHtmlContent({
      scriptUri: this.view.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'out', 'webView', 'webview.js')),
      nonce: this.getNonce()
    });
  }

  private setupMessageHandling(): void {
    if (!this.view) return;

    this.view.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'uiReady':
            this.currentChatId = this.generateChatId();
            console.log(`[WebviewProvider DEBUG] UI Ready. New Chat ID: ${this.currentChatId}`);
            this.postMessage('sessionReady', {
              chatId: this.currentChatId,
              messages: [],
              testMode: this.testModeEnabled
            });
            break;

          case 'userMessageSent':
            if (!this.currentChatId) {
              console.error('[WebviewProvider DEBUG] userMessageSent but no currentChatId.');
              this.postMessage('systemError', { message: 'No active chat session' });
              return;
            }
            console.log(`[WebviewProvider DEBUG] userMessageSent for chatId: ${this.currentChatId}. Payload: ${JSON.stringify(message.payload)}`);
            await this.handleUserMessage(message.payload);
            break;
            
          case 'permissionResponse':
            // Recibir respuesta de la UI sobre una solicitud de permiso
            console.log(`[WebviewProvider DEBUG] Permission response received: ${JSON.stringify(message.payload)}`);
            // Emitir evento para que PermissionManager lo reciba
            this.internalEventDispatcher.dispatch(EventType.USER_INPUT_RECEIVED, {
              uiOperationId: message.payload.operationId,
              value: message.payload.allowed,
              wasCancelled: !message.payload.allowed,
              chatId: this.currentChatId || undefined
            });
            break;

          case 'newChatRequestedByUI':
            this.currentChatId = this.generateChatId();
            this.currentOperationId = null; 
            console.log(`[WebviewProvider DEBUG] newChatRequestedByUI. New Chat ID: ${this.currentChatId}`);
            this.postMessage('newChatStarted', { chatId: this.currentChatId });
            break;

          case 'command': // Comando directo desde la UI para ejecutar una herramienta
            console.log(`[WebviewProvider DEBUG] Received command from UI: ${message.payload?.command}`);
            
            if (message.payload?.command === 'toggleTestMode') {
              // Este comando se maneja en extension.ts, no necesitamos hacer nada aquí
              console.log(`[WebviewProvider DEBUG] toggleTestMode command received from UI`);
            } else if (message.payload?.command === 'getProjectFiles') {
              if (!this.currentChatId) {
                this.postMessage('systemError', { message: 'No active chat session to associate with tool execution.' });
                return;
              }
              try {
                // Usar el nuevo método invokeTool de ApplicationLogicService
                const result = await this.appLogicService.invokeTool(
                  'listFiles', // Nombre de la herramienta
                  { pattern: '**/*' }, // Parámetros para listFiles (ajusta según tu esquema Zod)
                                      // El esquema de listFiles tiene 'pattern' como opcional con default '**/*'
                                      // así que pasar {} también funcionaría si quieres el default.
                  { chatId: this.currentChatId } // Contexto de ejecución
                );
                
                if (result.success && result.data?.files) {
                  // Asumimos que result.data.files es Array<{ path: string; type: 'file' | 'directory' | ... }>
                  const filePaths = (result.data.files as Array<{ path: string; type: string }>)
                    .filter(f => f.type === 'file') // Filtrar solo archivos
                    .map(f => f.path);

                  this.postMessage('projectFiles', { files: filePaths });
                } else {
                  const errorMsg = result.error || 'Failed to list project files (no data or unsuccessful)';
                  console.error('[WebviewProvider] Error getting project files:', errorMsg);
                  this.postMessage('systemError', { message: errorMsg });
                }
              } catch (error: any) {
                console.error('[WebviewProvider] Error in getProjectFiles handler:', error);
                this.postMessage('systemError', { message: error.message || 'Failed to list project files' });
              }
            }
            break;

          default:
            console.warn('[WebviewProvider] Unknown message type from UI:', message.type);
            break;
        }
      },
      null,
      this.disposables
    );
  }

  private async handleUserMessage(payload: { text: string; files?: string[] }): Promise<void> {
    if (!this.currentChatId) { // Doble check, aunque ya se hace en el switch
        this.postMessage('systemError', { message: 'No active chat session' });
        return;
    }
    if (!payload.text?.trim()) {
      this.postMessage('systemError', { message: 'Message cannot be empty' });
      return;
    }
    
    this.currentOperationId = `op_${crypto.randomBytes(8).toString('hex')}`;
    console.log(`[WebviewProvider DEBUG] Starting handleUserMessage. ChatID: ${this.currentChatId}, New OpID: ${this.currentOperationId}`);

    // Indicar a la UI que el procesamiento ha comenzado para esta operación
    this.postMessage('processingStarted', { operationId: this.currentOperationId });

    try {
      const result = await this.appLogicService.processUserMessage(
        this.currentChatId,
        payload.text,
        { files: payload.files || [] } 
      );

      console.log(`[WebviewProvider DEBUG] appLogicService.processUserMessage result for OpID ${this.currentOperationId}:`, JSON.stringify(result).substring(0, 200));

      // The final assistant response will be sent via the RESPONSE_GENERATED event, handled in handleInternalEvent.
      // We no longer directly post 'assistantResponse' from here based on result.finalResponse.

      if (!result.success) { // Si falló explícitamente
        const errorMessage = result.error || 'Processing failed to produce a response.';
        console.log(`[WebviewProvider DEBUG] Attempting to post 'systemError' (from processUserMessage failure). OpID: ${this.currentOperationId}, Message: ${errorMessage}`);
        this.postMessage('systemError', { 
          message: errorMessage,
          operationId: this.currentOperationId
        });
      } else if (result.success && !result.finalResponse) { // Si success es true pero no hay finalResponse (esperado, ya que se maneja por evento)
        // Esto es ahora el flujo esperado si el procesamiento fue exitoso pero la respuesta final
        // se enviará a través del evento RESPONSE_GENERATED.
        // También cubre casos donde el agente podría estar esperando más input (askUser) o completó sin una respuesta textual directa.
        console.log(`[WebviewProvider DEBUG] processUserMessage successful. Final response expected via event. OpID: ${this.currentOperationId}. State: ${result.updatedState?.completionStatus}`);
      } else if (result.success && result.finalResponse) {
        // Este caso (success y finalResponse presente) ahora es inesperado si ApplicationLogicService fue refactorizado
        // para no devolver finalResponse directamente para la UI.
        // Podríamos loguear una advertencia si esto ocurre.
        console.warn(`[WebviewProvider WARN] processUserMessage returned success AND finalResponse. This might indicate an old flow. OpID: ${this.currentOperationId}. Response will be handled by event.`);
      }  
    } catch (error: any) {
      console.error('[WebviewProvider] Critical error processing message:', error);
      const criticalErrorMessage = error.message || 'An unexpected critical error occurred';
      console.log(`[WebviewProvider DEBUG] Attempting to post 'systemError' (critical). OpID: ${this.currentOperationId}, Message: ${criticalErrorMessage}`);
      this.postMessage('systemError', { 
        message: criticalErrorMessage,
        operationId: this.currentOperationId 
      });
    } finally {
        // Indicar a la UI que el procesamiento para esta operación ha terminado (incluso si falló)
        // Esto es importante para que la UI pueda, por ejemplo, reactivar el input del usuario.
        if (this.currentOperationId) { // Solo si había una operación activa
            console.log(`[WebviewProvider DEBUG] Posting 'processingFinished'. OpID: ${this.currentOperationId}`);
            this.postMessage('processingFinished', { operationId: this.currentOperationId });
            this.currentOperationId = null; 
            // console.log(`[WebviewProvider DEBUG] OpID cleared after processingFinished.`);
        }
    }
  }

  private subscribeToInternalEvents(): void {
    this.dispatcherSubscriptions.forEach(s => s.unsubscribe());
    this.dispatcherSubscriptions = [];

    const eventTypesToWatch: EventType[] = [
      EventType.TOOL_EXECUTION_STARTED,
      EventType.TOOL_EXECUTION_COMPLETED,
      EventType.TOOL_EXECUTION_ERROR,
      EventType.SYSTEM_ERROR,
      EventType.USER_INTERACTION_REQUIRED, // <--- AÑADIR para askUser
      EventType.RESPONSE_GENERATED, // <--- AÑADIR para sendResponseToUser y respuestas del agente
    ];

    eventTypesToWatch.forEach(eventType => {
      this.dispatcherSubscriptions.push(
        this.internalEventDispatcher.subscribe(eventType, (event: WindsurfEvent) => this.handleInternalEvent(event))
      );
    });
    console.log('[WebviewProvider] Subscribed to UI-relevant events. Watched types:', eventTypesToWatch.join(', '));
  }

  private handleInternalEvent(event: WindsurfEvent): void {
    if (!this.view) return;
    
    const eventChatId = event.payload.chatId;
    // console.log(`[WebviewProvider DEBUG] Received internal event: ${event.type}, CurrentOpID: ${this.currentOperationId}, EventChatID: ${eventChatId}, CurrentChatID: ${this.currentChatId}`);

    // Filtrar eventos que no son para el chat actual, excepto errores de sistema globales
    if (event.type !== EventType.SYSTEM_ERROR && eventChatId && eventChatId !== this.currentChatId) {
        // console.log(`[WebviewProvider DEBUG] Event ${event.type} for different chatId ${eventChatId} ignored. Current is ${this.currentChatId}.`);
        return;
    }

    let uiMessagePayload: any = {
        id: `event_${event.id || Date.now()}`,
        timestamp: event.timestamp || Date.now(),
        operationId: this.currentOperationId, // Asociar con la operación actual si existe
    };
    let uiMessageType: string | null = null;

    switch (event.type) {
      case EventType.TOOL_EXECUTION_STARTED:
        const toolStart = event.payload as ToolExecutionEventPayload;
        uiMessageType = 'agentActionUpdate';
        uiMessagePayload.content = `Ejecutando ${toolStart.toolName || 'herramienta'}...`;
        uiMessagePayload.status = 'tool_executing';
        uiMessagePayload.toolName = toolStart.toolName;
        break;

      case EventType.TOOL_EXECUTION_COMPLETED:
        const toolComplete = event.payload as ToolExecutionEventPayload;
        uiMessageType = 'agentActionUpdate';
        // Podríamos querer mostrar el resultado de la herramienta si es breve y útil
        // let resultSummary = toolComplete.result ? `: ${JSON.stringify(toolComplete.result).substring(0,30)}...` : '.';
        // uiMessagePayload.content = `${toolComplete.toolName || 'La herramienta'} finalizó${resultSummary}`;
        uiMessagePayload.content = `${toolComplete.toolName || 'La herramienta'} finalizó.`;
        uiMessagePayload.status = 'success';
        uiMessagePayload.toolName = toolComplete.toolName;
        break;

      case EventType.TOOL_EXECUTION_ERROR:
        const toolError = event.payload as ToolExecutionEventPayload;
        uiMessageType = 'agentActionUpdate';
        uiMessagePayload.content = `Error en ${toolError.toolName || 'herramienta'}: ${toolError.error || 'desconocido'}`;
        uiMessagePayload.status = 'error';
        uiMessagePayload.toolName = toolError.toolName;
        break;

      case EventType.SYSTEM_ERROR:
        const sysError = event.payload as SystemEventPayload | ErrorOccurredEventPayload;
        uiMessageType = 'systemError'; // Usar un tipo de mensaje UI diferente para errores del sistema
        uiMessagePayload.message = 'message' in sysError ? sysError.message : sysError.errorMessage || 'Error inesperado del sistema.';
        // operationId podría no ser relevante o ser null si es un error global
        break;
      
      case EventType.USER_INPUT_RECEIVED: // Respuesta a askUser o a solicitudes de permisos
        // Si es una respuesta a una solicitud de permiso, la manejamos en PermissionManager
        // Si es una respuesta a askUser, se maneja directamente en el flujo que lo llamó
        break;

      case EventType.USER_INTERACTION_REQUIRED: // Para askUser y solicitudes de permisos
        const interactionReq = event.payload as any; // UserInteractionRequiredPayload
        
        // Si es una solicitud de permiso (tiene title 'Permission Required')
        if (interactionReq.interactionType === 'confirmation' && interactionReq.title === 'Permission Required') {
          // Extraer información de la herramienta y el permiso del mensaje
          const toolNameMatch = interactionReq.promptMessage.match(/Tool '([^']+)'/);
          const permissionMatch = interactionReq.promptMessage.match(/permission: '([^']+)'/);
          
          this.postMessage('permissionRequest', {
            toolName: toolNameMatch ? toolNameMatch[1] : 'Unknown Tool',
            permission: permissionMatch ? permissionMatch[1] : 'Unknown Permission',
            description: interactionReq.promptMessage,
            params: interactionReq.options || [],
            operationId: interactionReq.uiOperationId
          });
          return; // No enviar mensaje genérico de userInputRequired
        }
        
        // Para otros tipos de interacción, usar el comportamiento normal
        uiMessageType = 'userInputRequired'; // Mensaje específico para la UI
        break;

      case EventType.RESPONSE_GENERATED: // Handles final assistant responses
        const responseGen = event.payload as any; // TODO: Replace 'any' with specific ResponseGeneratedEventPayload type
        // Ensure this event is for the active chat and is a final response
        if (responseGen.isFinal && responseGen.chatId === this.currentChatId) {
            uiMessageType = 'assistantResponse';
            uiMessagePayload.content = responseGen.responseContent;
            
            // If the event payload carries a specific operationId, use it.
            // Otherwise, uiMessagePayload.operationId retains this.currentOperationId (set at initialization).
            if (responseGen.operationId) {
                uiMessagePayload.operationId = responseGen.operationId;
            }
            
            console.log(`[WebviewProvider DEBUG] Posting 'assistantResponse' from RESPONSE_GENERATED event. Event OpID: ${responseGen.operationId}, Current/Default OpID: ${this.currentOperationId}, Final OpID for UI: ${uiMessagePayload.operationId}`);
        } else {
            // Log if it's ignored for UI posting (e.g., not final or for a different chat)
            if (responseGen.chatId !== this.currentChatId) {
                console.log(`[WebviewProvider DEBUG] RESPONSE_GENERATED event for different chatId ${responseGen.chatId} (current: ${this.currentChatId}) ignored for UI 'assistantResponse'.`);
            } else if (!responseGen.isFinal) {
                console.log(`[WebviewProvider DEBUG] Non-final RESPONSE_GENERATED event for chatId ${responseGen.chatId} ignored for UI 'assistantResponse'.`);
            }
        }
        break;
      
      default: 
        return; 
    }

    if (uiMessageType) {
      // Para eventos de herramientas, deben estar asociados a una operación.
      if (uiMessageType === 'agentActionUpdate' && !uiMessagePayload.operationId && event.type.startsWith('tool:execution:')) {
        console.warn(`[WebviewProvider DEBUG] No operationId for tool event ${event.type} in agentActionUpdate. Message: ${uiMessagePayload.content?.substring(0,50)}...`);
        // No enviar si no hay operationId para un update de acción de agente
        // a menos que sea un error de sistema que se quiera mostrar globalmente.
        return; 
      }
      this.postMessage(uiMessageType, uiMessagePayload);
    }
  }

  public requestShowHistory(): void {
    console.log(`[WebviewProvider DEBUG] requestShowHistory called.`);
    this.postMessage('showHistory', {});
  }

  public startNewChat(): void {
    const oldChatId = this.currentChatId;
    this.currentChatId = this.generateChatId();
    this.currentOperationId = null; 
    console.log(`[WebviewProvider DEBUG] startNewChat called. Old Chat ID: ${oldChatId}, New Chat ID: ${this.currentChatId}. OpID cleared.`);
    this.postMessage('newChatStarted', { chatId: this.currentChatId });
  }
  
  /**
   * Notifica a la UI sobre el cambio en el modo de prueba.
   * @param enabled True si el modo de prueba está habilitado, false en caso contrario.
   */
  public notifyTestModeChange(enabled: boolean): void {
    this.testModeEnabled = enabled;
    console.log(`[WebviewProvider DEBUG] Test mode ${enabled ? 'enabled' : 'disabled'}. Notifying UI.`);
    this.postMessage('testModeChanged', { enabled });
  }

  private postMessage(type: string, payload: any): void {
    if (this.view) {
      this.view.webview.postMessage({ type, payload });
    } else {
      console.warn(`[WebviewProvider DEBUG] View not available. Cannot post message: Type: ${type}`);
    }
  }

  private generateChatId(): string {
    return `chat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private getNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  public dispose(): void {
    console.log(`[WebviewProvider DEBUG] Disposing WebviewProvider.`);
    this.disposables.forEach(d => d.dispose());
    this.dispatcherSubscriptions.forEach(s => s.unsubscribe());
    this.dispatcherSubscriptions = [];
  }
}