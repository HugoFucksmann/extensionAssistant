// src/vscode/webView/WebviewProvider.ts
import * as vscode from 'vscode';
import { getReactHtmlContent } from './htmlTemplate'; // Asumiendo que es getReactHtmlContent
import { ThemeManager } from './ThemeManager';
import { SessionManager } from './SessionManager'; // SessionManager sigue siendo útil

// Nuevas importaciones y cambios
import { ApplicationLogicService } from '../../core/ApplicationLogicService';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import { IncomingMessageValidator, ValidationResult } from './IncomingMessageValidator'; // Importar el validador
import { EventSubscriptionManager } from './EventSubscriptionManager';
import { EventType } from '../../features/events/eventTypes'; // Para emitir eventos si es necesario

export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];

  // Componentes modulares actualizados
  private incomingMessageValidator: IncomingMessageValidator;
  private eventManager: EventSubscriptionManager;
  private sessionManager: SessionManager;
  private themeManager: ThemeManager;
  // El dispatcher se pasa desde la factory
  private dispatcher: InternalEventDispatcher;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly appLogicService: ApplicationLogicService, // Recibe ApplicationLogicService
    private readonly internalDispatcher: InternalEventDispatcher // Recibe InternalEventDispatcher
  ) {
    this.dispatcher = internalDispatcher; // Guardar referencia al dispatcher
    this.sessionManager = new SessionManager();
    this.incomingMessageValidator = new IncomingMessageValidator(this.appLogicService);

    this.eventManager = new EventSubscriptionManager(
      this.sessionManager,
      this.postMessageToUI.bind(this),
      this.dispatcher // Pasar el dispatcher al EventSubscriptionManager
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
    this.setupMessageHandling(); // Esto usará el IncomingMessageValidator
    this.eventManager.setupEventListeners(); // Esto escuchará al InternalEventDispatcher
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
          // El mensaje fue aceptado y el validador llamó al ApplicationLogicService.
          // Los resultados del servicio de lógica (respuestas, errores, etc.)
          // deberían idealmente generar eventos desde capas más profundas (ej. ReActGraph)
          // o desde el propio ApplicationLogicService (si decidimos que SÍ puede usar el dispatcher
          // para eventos de ALTO NIVEL como "procesamiento de mensaje completado/fallido").
          // Por ahora, asumimos que el validador/servicio se encarga de la lógica,
          // y EventSubscriptionManager reaccionará a los eventos emitidos.

          // Ejemplo: si el validador indica una acción inmediata para la UI (menos común)
          // if (validationOutcome.immediateUiResponse) {
          //   this.postMessageToUI(validationOutcome.immediateUiResponse.type, validationOutcome.immediateUiResponse.payload);
          // }

          // Si la acción fue 'newChatRequestedByUI' y fue válida, SessionManager ya fue actualizado
          // por IncomingMessageValidator (o debería serlo).
          // EventSubscriptionManager debería capturar un evento CONVERSATION_CLEARED o similar
          // y enviar el estado 'newChatStarted' a la UI.
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
      // console.debug('[WebviewProvider] Posting to UI:', { type, payload }); // Usar debug
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
    
    // Dispatch separate event for new chat
    this.dispatcher.dispatch(EventType.CONVERSATION_STARTED, {
        chatId: newChatId,
        source: 'WebviewProvider.Command.NewChat'
    });
    // La UI debería reaccionar al evento CONVERSATION_ENDED (cleared)
    // y/o esperar un mensaje 'newChatStarted' que EventSubscriptionManager enviará.
    // Para asegurar que la UI se actualice, podemos enviar explícitamente:
    this.postMessageToUI('newChatStarted', { chatId: newChatId });
    console.log(`[WebviewProvider] New chat started by command: ${newChatId}`);
  }

  public requestShowHistory(): void {
    // TODO: Obtener historial real desde ApplicationLogicService o un servicio de historial dedicado
    // Esta lógica podría implicar llamar a appLogicService.getChatHistory()
    // y luego emitir un evento o enviar directamente a la UI.
    console.log('[WebviewProvider] History requested by command.');
    // Por ahora, simulamos y enviamos directamente.
    // Idealmente, esto también pasaría por el flujo de eventos.
    const simulatedHistory = [
      { id: 'chat1', title: 'Old Chat 1', timestamp: Date.now() - 100000, messages: [] },
      { id: 'chat2', title: 'Another Chat', timestamp: Date.now() - 200000, messages: [] },
    ];
    // Esto debería ser un evento que EventSubscriptionManager escucha, o un mensaje directo
    this.postMessageToUI('showHistoryView', { chats: simulatedHistory });
  }

  public dispose(): void {
    console.log('[WebviewProvider] Disposing...');
    this.disposables.forEach((d) => d.dispose());
    if (this.eventManager && typeof (this.eventManager as any).dispose === 'function') {
        (this.eventManager as any).dispose(); // Asegurar que EventSubscriptionManager se desuscriba
    }
    // No necesitamos disponer de appLogicService o dispatcher aquí, ComponentFactory lo hace.
  }
}