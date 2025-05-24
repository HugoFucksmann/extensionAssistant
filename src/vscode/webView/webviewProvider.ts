// src/vscode/webView/WebviewProvider.ts
import * as vscode from 'vscode';
import { getReactHtmlContent } from './htmlTemplate';
import { ThemeManager } from './ThemeManager';
import { SessionManager } from './SessionManager';


import { ApplicationLogicService } from '../../core/ApplicationLogicService';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import { IncomingMessageValidator, ValidationResult } from './IncomingMessageValidator'; 
import { EventSubscriptionManager } from './EventSubscriptionManager';
import { EventType } from '../../features/events/eventTypes'; 

export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];


  private incomingMessageValidator: IncomingMessageValidator;
  private eventManager: EventSubscriptionManager;
  private sessionManager: SessionManager;
  private themeManager: ThemeManager;
  
  private dispatcher: InternalEventDispatcher;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly appLogicService: ApplicationLogicService, 
    private readonly internalDispatcher: InternalEventDispatcher 
  ) {
    this.dispatcher = internalDispatcher; 
    this.sessionManager = new SessionManager();
    this.incomingMessageValidator = new IncomingMessageValidator(this.appLogicService);

    this.eventManager = new EventSubscriptionManager(
      this.sessionManager,
      this.postMessageToUI.bind(this),
      this.dispatcher 
    );
    this.themeManager = new ThemeManager(this.postMessageToUI.bind(this));

    console.log('[WebviewProvider] Initialized with new architecture components.');
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void {
    this.view = webviewView;
    this.setupWebview();
    this.setupMessageHandling(); 
    this.eventManager.setupEventListeners();
    this.themeManager.setup(this.disposables);

    // Informar a la UI que está lista y enviar el estado inicial de la sesión
    // Esto se hacía en UIMessageHandler, ahora lo hace directamente el provider
    // al recibir 'uiReady' o al resolver la vista.
    // Es mejor que la UI envíe 'uiReady' para iniciar este flujo.
  }

  private setupWebview(): void {
    if (!this.view) return;

    this.view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    this.view.webview.html = getReactHtmlContent(this.extensionUri, this.view.webview);
  }

  private setupMessageHandling(): void {
    if (!this.view) return;

    this.view.webview.onDidReceiveMessage(
      async (message: { type: string; payload: any }) => {
        console.log('[WebviewProvider] Received message from UI:', message);
        const currentChatId = this.sessionManager.getCurrentChatId();

        if (message.type === 'uiReady') {
          // La UI está lista, inicializar o restaurar sesión y enviar a la UI
          const session = await this.sessionManager.initializeOrRestore();
          this.postMessageToUI('sessionReady', {
            chatId: session.chatId,
            messages: [], // TODO: Cargar mensajes si no es nueva sesión (desde ApplicationLogicService o MemoryManager)
            // Podrías obtener el historial del chat actual aquí si es necesario
          });
          this.themeManager.sendCurrentTheme(); // Enviar tema actual
          return;
        }

        if (!currentChatId) {
          console.warn('[WebviewProvider] No active chat session. Ignoring message:', message.type);
          this.postMessageToUI('systemError', {
            message: 'No active chat session. Please start or select a chat.',
          });
          return;
        }

        // Usar IncomingMessageValidator para manejar el mensaje
        const validationOutcome: ValidationResult = await this.incomingMessageValidator.handleMessage(
          message,
          currentChatId
        );

        if (!validationOutcome.isValid) {
          console.warn(`[WebviewProvider] Invalid message: ${validationOutcome.error}`, message);
          this.postMessageToUI('systemError', {
            message: validationOutcome.error || 'Invalid message received from UI.',
            source: `WebviewProvider.Validation.${message.type}`,
          });
          // También podríamos emitir un evento ERROR_OCCURRED a través del dispatcher
          this.dispatcher.dispatch(EventType.ERROR_OCCURRED, {
            chatId: currentChatId,
            error: validationOutcome.error || 'Invalid message from UI',
            source: `WebviewProvider.Validation.${message.type}`
          });
        } else {
       
          if (message.type === 'newChatRequestedByUI' && validationOutcome.isValid) {
            const newChatId = this.sessionManager.startNewChat();
            // Dispatch conversation ended for old chat
            this.dispatcher.dispatch(EventType.CONVERSATION_ENDED, {
                chatId: currentChatId,
                cleared: true,
                source: 'WebviewProvider.NewChat'
            });
            // Dispatch conversation started for new chat
            this.dispatcher.dispatch(EventType.CONVERSATION_STARTED, {
                chatId: newChatId,
                source: 'WebviewProvider.NewChat'
            });
            // Also send direct message to UI
            this.postMessageToUI('newChatStarted', { chatId: newChatId });
          }
        }
      },
      null,
      this.disposables
    );
  }

  private postMessageToUI(type: string, payload: any): void {
    if (this.view?.webview) {

      this.view.webview.postMessage({ type, payload });
    } else {
      console.warn(`[WebviewProvider] Cannot post message. View unavailable. Type: ${type}`);
    }
  }

  // Métodos públicos para control externo (comandos de VS Code)
  public startNewChat(): void {
    const oldChatId = this.sessionManager.getCurrentChatId();
    const newChatId = this.sessionManager.startNewChat();

    // Si había un chat activo, notificar que se limpió/terminó
    if (oldChatId) {
        this.appLogicService.clearConversation(oldChatId); // Esto debería manejar la lógica de limpieza
        this.dispatcher.dispatch(EventType.CONVERSATION_ENDED, {
            chatId: oldChatId,
            cleared: true,
            source: 'WebviewProvider.Command.NewChat'
        });
    }
    
   
    this.dispatcher.dispatch(EventType.CONVERSATION_STARTED, {
        chatId: newChatId,
        source: 'WebviewProvider.Command.NewChat'
    });
 
    this.postMessageToUI('newChatStarted', { chatId: newChatId });
    console.log(`[WebviewProvider] New chat started by command: ${newChatId}`);
  }

  public requestShowHistory(): void {
   
    console.log('[WebviewProvider] History requested by command.');
    
    const simulatedHistory = [
      { id: 'chat1', title: 'Old Chat 1', timestamp: Date.now() - 100000, messages: [] },
      { id: 'chat2', title: 'Another Chat', timestamp: Date.now() - 200000, messages: [] },
    ];
   
    this.postMessageToUI('showHistoryView', { chats: simulatedHistory });
  }

  public dispose(): void {
    console.log('[WebviewProvider] Disposing...');
    this.disposables.forEach((d) => d.dispose());
    if (this.eventManager && typeof (this.eventManager as any).dispose === 'function') {
        (this.eventManager as any).dispose(); 
    }
   
  }
}