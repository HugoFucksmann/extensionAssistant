// src/vscode/WebviewProvider.ts
import * as vscode from 'vscode';
import { getReactHtmlContent } from './htmlTemplate'; // Asumiendo que es la correcta
import { ThemeManager } from './ThemeManager';
import { SessionManager } from './SessionManager';
import { WebviewMessageHandler } from './WebviewMessageHandler';
import { EventBus } from '@features/events/EventBus';
import { ChatService } from '@core/ChatService';
import { ConversationStartedPayload, ErrorOccurredPayload, EventType, ResponseEventPayload, SystemEventPayload, ToolExecutionEventPayload, WindsurfEvent } from '@features/events/eventTypes'; // Importar WindsurfEvent


export class WebviewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private disposables: vscode.Disposable[] = [];

    private sessionManager: SessionManager;
    private messageHandler: WebviewMessageHandler;
    private themeManager: ThemeManager;
    private eventBus: EventBus;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly chatService: ChatService,
        private readonly extensionContext: vscode.ExtensionContext // AÑADIDO
    ) {
        this.eventBus = EventBus.getInstance({ enableDebugLogging: true });
        // PASAR extensionContext a SessionManager
        this.sessionManager = new SessionManager(this.extensionContext);
        this.messageHandler = new WebviewMessageHandler(
            this.chatService,
            this.sessionManager,
            this.postMessageToWebview.bind(this) // Renombrado para claridad
        );
        this.themeManager = new ThemeManager(this.postMessageToWebview.bind(this));
    }

    resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView;
        this.setupWebview();
        this.setupMessageHandling(); // WebviewMessageHandler se encarga de los mensajes *desde* la webview
        this.setupEventListeners(); // Esto es para eventos *del EventBus interno* hacia la webview
        this.themeManager.setup(this.disposables);

        // Informar a la UI que el backend está listo para recibir el 'webview:ready'
        // No es estrictamente necesario si la UI envía 'webview:ready' al cargar.
        // this.postMessageToWebview('extension:backendReady', {});
    }

    private setupWebview(): void {
        if (!this.view) return;

        this.view.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri, vscode.Uri.joinPath(this.extensionUri, 'out')] // Asegurar que 'out' esté permitido
        };
        this.view.webview.html = getReactHtmlContent(this.extensionUri, this.view.webview);
    }

    private setupMessageHandling(): void {
        if (!this.view) return;

        this.view.webview.onDidReceiveMessage(
            (message) => this.messageHandler.handle(message),
            null,
            this.disposables
        );
    }

    private setupEventListeners(): void {
        const eventTypesToRoute = [
            EventType.RESPONSE_GENERATED,
            EventType.TOOL_EXECUTION_STARTED,
            EventType.TOOL_EXECUTION_COMPLETED,
            EventType.TOOL_EXECUTION_ERROR,
            EventType.CONVERSATION_STARTED, // Podría ser útil para la UI, aunque processUserMessage ya envía SET_PHASE
            EventType.ERROR_OCCURRED, // Errores del sistema originados en el backend
            EventType.SYSTEM_INFO, // Para logs o notificaciones en UI
            EventType.SYSTEM_WARNING,
        ];

        eventTypesToRoute.forEach(eventType => {
            // Guardar la referencia del listener para poder removerlo después
            const listener = (event: WindsurfEvent) => this.routeEventToWebview(event);
            this.eventBus.onEvent(eventType, listener);
            this.disposables.push({ dispose: () => this.eventBus.off(eventType, listener as any) }); // off necesita la referencia exacta
        });
    }

    private routeEventToWebview(event: WindsurfEvent<any>): void { // Usar WindsurfEvent<any> o WindsurfEvent<EventPayload>
      const currentChatId = this.sessionManager.getCurrentChatId();

      if (event.payload?.chatId && currentChatId && event.payload.chatId !== currentChatId) {
          if (event.type !== EventType.SYSTEM_ERROR && event.type !== EventType.SYSTEM_INFO && event.type !== EventType.SYSTEM_WARNING) {
               return;
          }
      }

      switch (event.type) {
          case EventType.RESPONSE_GENERATED:
              // Type assertion para payload específico
              const responsePayload = event.payload as ResponseEventPayload;
              this.postMessageToWebview('extension:assistantResponse', {
                  id: `asst_${Date.now()}`,
                  content: responsePayload.response,
                  sender: 'assistant',
                  timestamp: event.timestamp,
                  metadata: { processingTime: responsePayload.duration },
                  chatId: responsePayload.chatId
              });
              break;

          case EventType.TOOL_EXECUTION_STARTED:
          case EventType.TOOL_EXECUTION_COMPLETED:
          case EventType.TOOL_EXECUTION_ERROR:
              const toolPayload = event.payload as ToolExecutionEventPayload;
              let status: 'started' | 'completed' | 'error' = 'started';
              if (event.type === EventType.TOOL_EXECUTION_COMPLETED) status = 'completed';
              if (event.type === EventType.TOOL_EXECUTION_ERROR) status = 'error';

              this.postMessageToWebview('extension:processingUpdate', {
                  type: 'UPDATE_TOOL',
                  payload: { tool: toolPayload.tool, status: status, data: toolPayload }, // data puede ser todo el toolPayload
                  chatId: toolPayload.chatId
              });
              break;

          case EventType.CONVERSATION_STARTED:
              const convStartedPayload = event.payload as ConversationStartedPayload;
              this.postMessageToWebview('extension:processingUpdate', {
                  type: 'SET_PHASE',
                  payload: 'conversation_started',
                  chatId: convStartedPayload.chatId
              });
              break;

          case EventType.ERROR_OCCURRED: // Error de lógica de negocio
              const errorOccurredPayload = event.payload as ErrorOccurredPayload;
              this.postMessageToWebview('extension:systemError', {
                  message: errorOccurredPayload.error || 'Unknown application error',
                  source: errorOccurredPayload.source || 'BackendApplication',
                  details: errorOccurredPayload.details,
                  stack: errorOccurredPayload.stack,
                  chatId: errorOccurredPayload.chatId
              });
              break;
          
          case EventType.SYSTEM_ERROR: // Error de infraestructura/EventBus
          case EventType.SYSTEM_INFO:
          case EventType.SYSTEM_WARNING:
              const systemPayload = event.payload as SystemEventPayload;
              let messageType = 'extension:systemInfo'; // Default
              if (event.type === EventType.SYSTEM_ERROR) messageType = 'extension:systemError';
              if (event.type === EventType.SYSTEM_WARNING) messageType = 'extension:systemWarning';

              this.postMessageToWebview(messageType, {
                  message: systemPayload.message,
                  details: systemPayload.details,
                  source: systemPayload.source,
                  level: systemPayload.level, // Puede ser útil para la UI
                  error: systemPayload.error, // Si es un SystemError
                  stack: systemPayload.stack, // Si es un SystemError
                  chatId: systemPayload.chatId
              });
              break;
      }
  }

    // Renombrado para claridad, es el método que envía mensajes a la UI
    private postMessageToWebview(type: string, payload: any): void {
        if (this.view?.webview) {
            this.view.webview.postMessage({ type, payload });
        } else {
            console.warn(`[WebviewProvider] Attempted to post message but webview is not available. Type: ${type}`);
        }
    }

    // Estos métodos son llamados por comandos de VS Code (definidos en package.json)
    // y deben interactuar con el SessionManager y luego informar a la UI.
    public command_startNewChat(): void {
        const chatId = this.sessionManager.startNewChat(); // Actualiza y guarda
        // Informar a la UI que un nuevo chat fue iniciado (posiblemente por un comando externo)
        this.postMessageToWebview('extension:newChatStarted', { chatId, messages: [] });
        // Opcional: Abrir la vista del chat si no está visible
        // vscode.commands.executeCommand('workbench.view.extension.ai-chat-sidebar'); // Ajustar al ID de tu vista
        // vscode.commands.executeCommand('aiChat.chatView.focus'); // Ajustar al ID de tu vista
    }

    public command_showHistory(): void {
      // Get the current chat state
      const currentChatId = this.sessionManager.getCurrentChatId();
      
      // If there's no active chat, initialize a new one
      if (!currentChatId) {
          const newChatId = this.sessionManager.startNewChat();
          this.postMessageToWebview('extension:showHistoryView', { 
              chats: [{
                  id: newChatId,
                  title: 'New Chat',
                  timestamp: Date.now(),
                  messageCount: 0
              }]
          });
          return;
      }
  
      // Try to get the current chat state
      try {
          const currentState = this.chatService.getChatStateManager().getConversationState(currentChatId);
          
          if (!currentState) {
              // If no state found, create a new chat
              const newChatId = this.sessionManager.startNewChat();
              this.postMessageToWebview('extension:showHistoryView', { 
                  chats: [{
                      id: newChatId,
                      title: 'New Chat',
                      timestamp: Date.now(),
                      messageCount: 0
                  }]
              });
              return;
          }
      
          // Show the current chat in history view
          const historyForUI = [{
              id: currentChatId,
              title: `Chat ${currentChatId.substring(0, 5)}...`,
              timestamp: currentState.timestamp || Date.now(),
              messageCount: currentState.history?.length || 0
          }];
      
          this.postMessageToWebview('extension:showHistoryView', { 
              chats: historyForUI 
          });
      } catch (error) {
          console.error('[WebviewProvider] Error loading chat state:', error);
          this.postMessageToWebview('extension:systemError', { 
              message: 'Error loading chat history',
              details: error instanceof Error ? error.message : String(error),
              source: 'WebviewProvider'
          });
      }
  }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        // No es necesario llamar a eventBus.dispose() si es un singleton global
        // y se quiere que siga funcionando para otras partes de la extensión.
        // Si EventBus es específico de esta WebviewProvider, entonces sí.
        // Basado en EventBus.getInstance(), es global.
        console.log('[WebviewProvider] Disposed.');
    }
}