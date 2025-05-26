// src/vscode/webview/WebviewProvider.ts
import * as vscode from 'vscode';
import { getReactHtmlContent } from './htmlTemplate';
import { ApplicationLogicService } from '../../core/ApplicationLogicService';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import { EventType, WindsurfEvent, ToolExecutionEventPayload, ReActEventPayload, NodeEventPayload, ErrorEventPayload } from '../../features/events/eventTypes';
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
        // console.log('[WebviewProvider] Received:', message.type); // Opcional para depuración

        switch (message.type) {
          case 'uiReady':
            this.currentChatId = this.generateChatId();
            this.postMessage('sessionReady', {
              chatId: this.currentChatId,
              messages: []
            });
            break;

          case 'userMessageSent':
            if (!this.currentChatId) {
              this.postMessage('systemError', { message: 'No active chat session' });
              return;
            }
            await this.handleUserMessage(message.payload);
            break;

          case 'newChatRequestedByUI':
            this.currentChatId = this.generateChatId();
            this.postMessage('newChatStarted', { chatId: this.currentChatId });
            break;

          // case 'showHistoryRequested': // Eliminado, se maneja por comando de VS Code
          //   this.postMessage('showHistory', {});
          //   break;

          case 'command':
            if (message.payload?.command === 'getProjectFiles') {
              try {
                const result = await this.appLogicService.executeTool('listFiles', {
                  dirPath: '.', 
                  excludePattern: 'node_modules|\\\\.git',
                  recursive: true
                });
                
                if (result.success && result.data?.files) {
                  this.postMessage('projectFiles', { 
                    files: result.data.files
                      .filter((f: {isDirectory: boolean}) => !f.isDirectory)
                      .map((f: {path: string}) => f.path) 
                  });
                } else {
                  console.error('Error getting project files:', result.error || 'No files data');
                  this.postMessage('systemError', { message: result.error || 'Failed to list project files (no data)' });
                }
              } catch (error) {
                console.error('Error in getProjectFiles handler:', error);
                this.postMessage('systemError', { message: 'Failed to list project files' });
              }
            }
            break;

          default:
            console.warn('[WebviewProvider] Unknown message type:', message.type);
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

    try {
      const result = await this.appLogicService.processUserMessage(
        this.currentChatId!,
        payload.text,
        { files: payload.files || [] }
      );

      if (result.success && result.finalResponse) {
        this.postMessage('assistantResponse', {
          id: `asst_${Date.now()}`,
          content: result.finalResponse,
          timestamp: Date.now(),
          operationId: this.currentOperationId
        });
        this.currentOperationId = null;
      } else {
        this.postMessage('systemError', { 
          message: result.error || 'Processing failed',
          operationId: this.currentOperationId
        });
        if (result.finalResponse) {
          this.currentOperationId = null;
        }
      }
    } catch (error: any) {
      console.error('[WebviewProvider] Error processing message:', error);
      this.postMessage('systemError', { 
        message: error.message || 'An unexpected error occurred',
        operationId: this.currentOperationId
      });
      this.currentOperationId = null;
    }
  }

    private subscribeToInternalEvents(): void {
      this.dispatcherSubscriptions.forEach(s => s.unsubscribe());
      this.dispatcherSubscriptions = [];
  
      const eventTypesToWatch: EventType[] = [
        EventType.REASONING_STARTED,
        EventType.REASONING_COMPLETED,
        EventType.TOOL_EXECUTION_STARTED,
        EventType.TOOL_EXECUTION_COMPLETED,
        EventType.TOOL_EXECUTION_ERROR,
        EventType.REFLECTION_STARTED,
        EventType.REFLECTION_COMPLETED,
        EventType.NODE_START,
        EventType.NODE_COMPLETE,
        EventType.NODE_ERROR,
        EventType.SYSTEM_INFO,
        EventType.SYSTEM_WARNING,
        EventType.SYSTEM_ERROR,
      ];
  
      eventTypesToWatch.forEach(eventType => {
        this.dispatcherSubscriptions.push(
          this.internalEventDispatcher.subscribe(eventType, (event: WindsurfEvent) => this.handleInternalEvent(event))
        );
      });
      // console.log('[WebviewProvider] Subscribed to internal ReAct events.'); // Opcional para depuración
    }
  
    private handleInternalEvent(event: WindsurfEvent): void {
      if (!this.view || !this.currentChatId ) {
        return;
      }
      
      if (event.payload.chatId && event.payload.chatId !== this.currentChatId) {
          // console.log(`[WebviewProvider] Ignoring event for different chatId. Current: ${this.currentChatId}, Event: ${event.payload.chatId}`); // Opcional
          return;
      }
  
      let messageText: string | undefined;
      let status: 'info' | 'success' | 'error' | 'thinking' | 'tool_executing' = 'info';
  
      switch (event.type) {
        case EventType.REASONING_STARTED:
          messageText = "Pensando...";
          status = 'thinking';
          break;
        case EventType.REASONING_COMPLETED:
          const reasoningPayload = event.payload as ReActEventPayload;
          const planSteps = (reasoningPayload.result as any)?.plan?.map((step: any) => step.step).join('\n- ');
          messageText = `Plan de acción generado.${planSteps ? `\nPlan:\n- ${planSteps}` : ''}`;
          status = 'info';
          break;
        case EventType.TOOL_EXECUTION_STARTED:
          const toolExecStartPayload = event.payload as ToolExecutionEventPayload;
          const toolName = toolExecStartPayload.tool || 'herramienta';
          messageText = `Ejecutando ${toolName}...`;
          status = 'tool_executing';
          break;
        case EventType.TOOL_EXECUTION_COMPLETED:
          const toolExecCompletedPayload = event.payload as ToolExecutionEventPayload;
          const completedTool = toolExecCompletedPayload.tool || 'herramienta';
          messageText = `Herramienta ${completedTool} completada.`;
          status = 'success';
          break;
        case EventType.TOOL_EXECUTION_ERROR:
          const toolExecErrorPayload = event.payload as ToolExecutionEventPayload;
          const errorTool = toolExecErrorPayload.tool || 'herramienta';
          const errorMsg = toolExecErrorPayload.error || 'Error desconocido';
          messageText = `Error ejecutando ${errorTool}: ${errorMsg}`;
          status = 'error';
          break;
        case EventType.REFLECTION_STARTED:
          messageText = "Reflexionando sobre los resultados...";
          status = 'thinking';
          break;
        case EventType.REFLECTION_COMPLETED:
          messageText = "Reflexión completada.";
          status = 'info';
          break;
        case EventType.NODE_START:
          const nodeStartPayload = event.payload as NodeEventPayload;
          messageText = `Iniciando: ${nodeStartPayload.nodeType || 'paso'}...`;
          status = 'thinking';
          break;
        case EventType.NODE_COMPLETE:
          const nodeCompletePayload = event.payload as NodeEventPayload;
          messageText = `${nodeCompletePayload.nodeType || 'Paso'} completado.`;
          status = 'success';
          break;
        case EventType.NODE_ERROR:
          const nodeErrorPayload = event.payload as NodeEventPayload;
          const nodeType = nodeErrorPayload.nodeType || 'proceso';
          const nodeError = nodeErrorPayload.error?.message || (nodeErrorPayload.error as any)?.toString() || 'Error desconocido';
          messageText = `Error en ${nodeType}: ${nodeError}`;
          status = 'error';
          break;
        case EventType.SYSTEM_INFO:
        case EventType.SYSTEM_WARNING:
        case EventType.SYSTEM_ERROR:
          const systemPayload = event.payload as ErrorEventPayload;
          messageText = systemPayload.message || 'Mensaje del sistema';
          status = event.type === EventType.SYSTEM_ERROR ? 'error' : (event.type === EventType.SYSTEM_WARNING ? 'info' : 'info');
          break;
      }
  
      if (messageText) {
        if (this.currentOperationId) {
          // console.log(`[WebviewProvider] Posting agentActionUpdate for opID ${this.currentOperationId}: ${messageText.substring(0,50)}... (Status: ${status})`); // Opcional
          this.postMessage('agentActionUpdate', {
            id: `agent_${event.id || Date.now()}`,
            content: messageText,
            status: status,
            timestamp: event.timestamp || Date.now(),
            operationId: this.currentOperationId
          });
        } else {
          // console.warn(`[WebviewProvider] No operation ID for agent action: ${messageText.substring(0,50)}...`); // Opcional
        }
      }
    }

  public requestShowHistory(): void {
    this.postMessage('showHistory', {});
  }

  public startNewChat(): void {
    this.currentChatId = this.generateChatId();
    this.postMessage('newChatStarted', { chatId: this.currentChatId });
  }

  private postMessage(type: string, payload: any): void {
    this.view?.webview.postMessage({ type, payload });
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
    this.disposables.forEach(d => d.dispose());
    this.dispatcherSubscriptions.forEach(s => s.unsubscribe());
    this.dispatcherSubscriptions = [];
  }
}