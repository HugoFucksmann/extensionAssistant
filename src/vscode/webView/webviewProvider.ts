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
  private currentOperationId: string | null = null;
  private dispatcherSubscriptions: { unsubscribe: () => void }[] = [];

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
        // console.log('[WebviewProvider] Received from UI:', message.type); 

        switch (message.type) {
          case 'uiReady':
            this.currentChatId = this.generateChatId();
            console.log(`[WebviewProvider DEBUG] UI Ready. New Chat ID: ${this.currentChatId}`);
            this.postMessage('sessionReady', {
              chatId: this.currentChatId,
              messages: [] 
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

          case 'newChatRequestedByUI':
            this.currentChatId = this.generateChatId();
            this.currentOperationId = null; 
            console.log(`[WebviewProvider DEBUG] newChatRequestedByUI. New Chat ID: ${this.currentChatId}`);
            this.postMessage('newChatStarted', { chatId: this.currentChatId });
            break;

          case 'command':
            console.log(`[WebviewProvider DEBUG] Received command from UI: ${message.payload?.command}`);
            if (message.payload?.command === 'getProjectFiles') {
              try {
                const result = await this.appLogicService.executeTool('listFiles', {
                  dirPath: '.', 
                  excludePattern: 'node_modules|\\.git', 
                  recursive: true
                });
                
                if (result.success && result.data?.files) {
                  this.postMessage('projectFiles', { 
                    files: result.data.files
                      .filter((f: {isDirectory: boolean}) => !f.isDirectory)
                      .map((f: {path: string}) => f.path) 
                  });
                } else {
                  console.error('[WebviewProvider] Error getting project files:', result.error || 'No files data');
                  this.postMessage('systemError', { message: result.error || 'Failed to list project files (no data)' });
                }
              } catch (error) {
                console.error('[WebviewProvider] Error in getProjectFiles handler:', error);
                this.postMessage('systemError', { message: 'Failed to list project files' });
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
    if (!payload.text?.trim()) {
      this.postMessage('systemError', { message: 'Message cannot be empty' });
      return;
    }
    
    this.currentOperationId = `op_${crypto.randomBytes(8).toString('hex')}`;
    console.log(`[WebviewProvider DEBUG] Starting handleUserMessage. New OpID: ${this.currentOperationId}`);

    try {
      const result = await this.appLogicService.processUserMessage(
        this.currentChatId!,
        payload.text,
        { files: payload.files || [] } 
      );

      console.log(`[WebviewProvider DEBUG] appLogicService.processUserMessage result for OpID ${this.currentOperationId}:`, JSON.stringify(result));

      if (result.success && result.finalResponse) {
        console.log(`[WebviewProvider DEBUG] Attempting to post 'assistantResponse'. OpID: ${this.currentOperationId}, Content: ${result.finalResponse.substring(0,50)}...`);
        this.postMessage('assistantResponse', {
          id: `asst_${Date.now()}`,
          content: result.finalResponse,
          timestamp: Date.now(),
          operationId: this.currentOperationId 
        });
        this.currentOperationId = null; 
        console.log(`[WebviewProvider DEBUG] OpID ${this.currentOperationId} (was ${this.currentOperationId}) cleared after assistantResponse.`);
      } else {
        const errorMessage = result.error || 'Processing failed to produce a response.';
        console.log(`[WebviewProvider DEBUG] Attempting to post 'systemError' (from processUserMessage). OpID: ${this.currentOperationId}, Message: ${errorMessage}`);
        this.postMessage('systemError', { 
          message: errorMessage,
          operationId: this.currentOperationId
        });
        this.currentOperationId = null; 
        console.log(`[WebviewProvider DEBUG] OpID ${this.currentOperationId} (was ${this.currentOperationId}) cleared after systemError from processUserMessage.`);
      }
    } catch (error: any) {
      console.error('[WebviewProvider] Critical error processing message:', error);
      const criticalErrorMessage = error.message || 'An unexpected critical error occurred';
      console.log(`[WebviewProvider DEBUG] Attempting to post 'systemError' (critical). OpID: ${this.currentOperationId}, Message: ${criticalErrorMessage}`);
      this.postMessage('systemError', { 
        message: criticalErrorMessage,
        operationId: this.currentOperationId 
      });
      this.currentOperationId = null; 
      console.log(`[WebviewProvider DEBUG] OpID ${this.currentOperationId} (was ${this.currentOperationId}) cleared after critical error.`);
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
      ];
  
      eventTypesToWatch.forEach(eventType => {
        this.dispatcherSubscriptions.push(
          this.internalEventDispatcher.subscribe(eventType, (event: WindsurfEvent) => this.handleInternalEvent(event))
        );
      });
      console.log('[WebviewProvider] Subscribed to UI-relevant events (Tools, System Errors). Watched types:', eventTypesToWatch.join(', '));
    }
  
    private handleInternalEvent(event: WindsurfEvent): void {
      if (!this.view) return; // No view, no postMessage
      // No filtrar por currentChatId aquí si queremos que SYSTEM_ERROR globales se muestren
      // Pero para TOOL_*, sí es importante.
      // if (event.payload.chatId && event.payload.chatId !== this.currentChatId) {
      //     console.log(`[WebviewProvider DEBUG] Ignoring event for different chatId. Current: ${this.currentChatId}, Event ChatID: ${event.payload.chatId}, Event Type: ${event.type}`);
      //     return;
      // }
      
      console.log(`[WebviewProvider DEBUG] Received internal event: ${event.type}, CurrentOpID: ${this.currentOperationId}, Event ChatID: ${event.payload.chatId}, Current ChatID: ${this.currentChatId}`);

      let messageText: string | undefined;
      let status: 'info' | 'success' | 'error' | 'thinking' | 'tool_executing' = 'info'; 
      let toolName: string | undefined; // Para logging y potencialmente para la UI

      // Filtrar eventos de herramientas si no corresponden al chat activo
      if (event.type.startsWith('tool:execution:') && event.payload.chatId && event.payload.chatId !== this.currentChatId) {
        console.log(`[WebviewProvider DEBUG] Tool event ${event.type} for different chatId ${event.payload.chatId} ignored. Current is ${this.currentChatId}.`);
        return;
      }

      switch (event.type) {
        case EventType.TOOL_EXECUTION_STARTED:
          const toolExecStartPayload = event.payload as ToolExecutionEventPayload;
          toolName = toolExecStartPayload.toolName || 'una herramienta';
          messageText = `Ejecutando ${toolName}...`;
          status = 'tool_executing';
          console.log(`[WebviewProvider DEBUG] Matched TOOL_EXECUTION_STARTED. Tool: ${toolName}`);
          break;

        case EventType.TOOL_EXECUTION_COMPLETED:
          const toolExecCompletedPayload = event.payload as ToolExecutionEventPayload;
          toolName = toolExecCompletedPayload.toolName || 'La herramienta';
          messageText = `${toolName} finalizó.`;
          status = 'success';
          console.log(`[WebviewProvider DEBUG] Matched TOOL_EXECUTION_COMPLETED. Tool: ${toolName}`);
          break;

        case EventType.TOOL_EXECUTION_ERROR:
          const toolExecErrorPayload = event.payload as ToolExecutionEventPayload;
          toolName = toolExecErrorPayload.toolName || 'una herramienta';
          const errorMsg = toolExecErrorPayload.error || 'Error desconocido';
          messageText = `Error ejecutando ${toolName}: ${errorMsg}`;
          status = 'error';
          console.log(`[WebviewProvider DEBUG] Matched TOOL_EXECUTION_ERROR. Tool: ${toolName}, Error: ${errorMsg}`);
          break;

        case EventType.SYSTEM_ERROR:
          const systemErrorPayload = event.payload as SystemEventPayload | ErrorOccurredEventPayload;
          messageText = 'message' in systemErrorPayload 
            ? systemErrorPayload.message 
            : systemErrorPayload.errorMessage || 'Ocurrió un error en el sistema.';
          status = 'error';
          // Para SYSTEM_ERROR, no necesariamente hay un currentOperationId si es un error global.
          // La UI decidirá cómo mostrarlo.
          console.log(`[WebviewProvider DEBUG] Matched SYSTEM_ERROR. Message: ${messageText}`);
          break;
        
        default: 
          console.log(`[WebviewProvider DEBUG] Event ${event.type} not explicitly handled for UI feedback by this switch.`);
          return; 
      }
  
      if (messageText) {
        // Para eventos de herramientas, deben estar asociados a una operación.
        // Para SYSTEM_ERROR, podría no haber operationId si es un error global.
        if (event.type.startsWith('tool:execution:') && !this.currentOperationId) {
          console.warn(`[WebviewProvider DEBUG] No currentOperationId for tool event ${event.type}. 'agentActionUpdate' NOT sent for: ${messageText.substring(0,50)}...`);
          return; // No enviar feedback de herramienta si no hay operación activa
        }

        console.log(`[WebviewProvider DEBUG] Attempting to post 'agentActionUpdate'. OpID: ${this.currentOperationId}, Status: ${status}, Content: ${messageText.substring(0, 50)}...`);
        this.postMessage('agentActionUpdate', {
          id: `agent_event_${event.id || Date.now()}`,
          content: messageText,
          status: status,
          timestamp: event.timestamp || Date.now(),
          operationId: this.currentOperationId, // Será null para SYSTEM_ERROR globales si no hay op activa
          toolName: toolName // Añadido para dar más contexto a la UI si lo necesita
        });
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

  private postMessage(type: string, payload: any): void {
    if (this.view) {
      // console.log(`[WebviewProvider DEBUG] Posting message to UI: Type: ${type}, Payload: ${JSON.stringify(payload).substring(0,100)}...`);
      this.view.webview.postMessage({ type, payload });
    } else {
      console.warn(`[WebviewProvider DEBUG] View not available. Cannot post message: Type: ${type}`);
    }
  }

  private generateChatId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  public dispose(): void {
    console.log(`[WebviewProvider DEBUG] Disposing WebviewProvider.`);
    this.disposables.forEach(d => d.dispose());
    this.dispatcherSubscriptions.forEach(s => s.unsubscribe());
    this.dispatcherSubscriptions = [];
  }
}