// src/vscode/webView/webviewProvider.ts
import * as vscode from 'vscode';
import { WindsurfController } from '../../core/WindsurfController';
import { eventBus } from '../../features/events/EventBus';
import { EventType, WindsurfEvent, ConversationEndedPayload } from '../../features/events/eventTypes'; // Asegúrate de importar ConversationEndedPayload
import { getReactHtmlContent } from './htmlTemplate';
import { MessageForwarder } from './MessageForwarder'; // Importar el nuevo MessageForwarder
// Quitar MessageHandler si ya no se usa directamente para todo
// import { MessageHandler } from './MessageHandler';

// ... (interfaces ToolStatus, ProcessingStatus si se mantienen aquí o se mueven)

export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private messageForwarder: MessageForwarder; // Usar MessageForwarder
  private disposables: vscode.Disposable[] = [];
  private currentChatId: string | undefined;
  private isSessionActive = false; // Para rastrear si hay una sesión válida

  // Mantenemos processingStatus aquí por ahora para el feedback a la UI
  private processingStatus: ProcessingStatus = {
    phase: '',
    status: 'inactive',
    tools: [],
    metrics: {},
  };

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly controller: WindsurfController
  ) {
    this.messageForwarder = new MessageForwarder(controller);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this.view = webviewView;

    this.view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    this.view.webview.html = getReactHtmlContent(this.extensionUri, this.view.webview);

    this.view.webview.onDidReceiveMessage(
      (message) => this.handleUIMessage(message), // Enlazar correctamente 'this'
      null,
      this.disposables
    );

    this.setupEventListeners();
    this.setupThemeHandler(); // Mantener el manejador de temas

    // No llamamos a initializeOrRestoreSession aquí directamente.
    // Esperaremos al mensaje 'uiReady' desde el frontend.
    console.log('[WebviewProvider] Webview resolved. Waiting for uiReady.');
  }

  private async initializeOrRestoreSession(): Promise<void> {
    if (this.isSessionActive && this.currentChatId) {
      console.log(`[WebviewProvider] Session already active: ${this.currentChatId}. Resending to UI.`);
      // Si ya está activa, solo reenviar el estado actual para sincronizar la UI si se recargó
      this.postMessageToUI('sessionReady', {
        chatId: this.currentChatId,
        messages: [], // TODO: Implementar recuperación de mensajes si es necesario
        // currentModel: this.controller.getActiveModelName(), // Si el controller expone esto
      });
      return;
    }

    this.currentChatId = this.generateChatId();
    this.isSessionActive = true;
    this.processingStatus = { phase: '', status: 'inactive', tools: [], metrics: {} }; // Resetear
    console.log(`[WebviewProvider] New session initialized: ${this.currentChatId}`);
    this.postMessageToUI('sessionReady', {
      chatId: this.currentChatId,
      messages: [], // Nuevo chat, sin mensajes previos
      // currentModel: this.controller.getActiveModelName(),
    });
  }

  public startNewChat(): void { // Llamado desde extension.ts o UI
    if (!this.view) {
      console.warn('[WebviewProvider] Attempted to start new chat, but view is not available.');
      return;
    }
    this.currentChatId = this.generateChatId();
    this.isSessionActive = true; // Asegurar que esté activa
    this.processingStatus = { phase: '', status: 'inactive', tools: [], metrics: {} }; // Resetear
    console.log(`[WebviewProvider] New chat explicitly started: ${this.currentChatId}`);
    this.postMessageToUI('newChatStarted', { chatId: this.currentChatId });
  }

  public requestShowHistory(): void { // Llamado desde extension.ts o UI
    if (!this.view) return;
    // TODO: Lógica para obtener el historial real.
    // const chatHistoryList = this.controller.getChatHistoryList(); // Asumiendo que el controller puede hacer esto
    const simulatedHistory = [
      { id: 'chat1', title: 'Old Chat 1', timestamp: Date.now() - 100000 },
      { id: 'chat2', title: 'Another Chat', timestamp: Date.now() - 200000 },
    ];
    console.log('[WebviewProvider] History requested. Sending simulated list.');
    this.postMessageToUI('showHistoryView', { chats: simulatedHistory });
  }

  private async handleUIMessage(message: any): Promise<void> {
    console.log('[WebviewProvider] Received from UI:', message);
    if (!message || typeof message.type !== 'string') {
        console.warn('[WebviewProvider] Received invalid message from UI:', message);
        return;
    }

    switch (message.type) {
      case 'uiReady':
        await this.initializeOrRestoreSession();
        break;
      case 'userMessageSent': // Cambiado desde 'sendMessageToController' para claridad
        if (!this.isSessionActive || !this.currentChatId) {
          this.postMessageToUI('systemError', { message: 'Chat session not active. Please start a new chat or refresh.' });
          return;
        }
        if (!message.payload || typeof message.payload.text !== 'string') {
            this.postMessageToUI('systemError', { message: 'Invalid user message payload.' });
            return;
        }
        // Actualizar estado de procesamiento ANTES de llamar al forwarder
        this.processingStatus = { phase: 'processing_user_message', status: 'active', tools: [], metrics: {}, startTime: Date.now() };
        this.postMessageToUI('processingUpdate', this.processingStatus); // Notificar a la UI

        await this.messageForwarder.forwardUserMessageToController(
          this.currentChatId,
          message.payload.text,
          message.payload.files || []
        );
        // La respuesta y el fin del procesamiento vendrán vía EventBus
        break;
      case 'newChatRequestedByUI':
        this.startNewChat();
        break;
      case 'historyRequestedByUI':
        this.requestShowHistory();
        break;
      // case 'loadChatFromHistory': // Si la UI pide cargar un chat específico
      //   this.loadSpecificChat(message.payload.chatId);
      //   break;
      default:
        console.warn(`[WebviewProvider] Unhandled UI message type: ${message.type}`);
        this.postMessageToUI('systemError', { message: `Unknown command from UI: ${message.type}` });
    }
  }

  private setupEventListeners(): void {
    const chatFilter = (event: WindsurfEvent): boolean => {
        // Si el evento no tiene chatId, es un evento global y debe procesarse (ej. error no asociado a chat)
        if (event.payload && typeof (event.payload as any).chatId === 'string') {
            return (event.payload as any).chatId === this.currentChatId;
        }
        return true; // Procesar eventos sin chatId (ej. errores globales del sistema)
    };

    eventBus.on(EventType.CONVERSATION_STARTED, (event: WindsurfEvent) => {
        if (!chatFilter(event)) return;
        this.processingStatus = {
            phase: 'conversation_started',
            status: 'active',
            startTime: Date.now(),
            tools: [],
            metrics: {}
        };
        this.postMessageToUI('processingUpdate', this.processingStatus);
    });

    eventBus.on(EventType.RESPONSE_GENERATED, (event: WindsurfEvent) => {
      if (!chatFilter(event)) {
        console.log(`[WebviewProvider] RESPONSE_GENERATED for chat ${ (event.payload as any).chatId} ignored, current is ${this.currentChatId}`);
        return;
      }
      console.log('[WebviewProvider] EventBus: RESPONSE_GENERATED for current chat', event.payload);
      this.postMessageToUI('assistantResponse', { // Tipo de mensaje específico para la UI
        chatId: this.currentChatId, // Asegurar que es el actual
        id: `asst_${event.id || Date.now()}`, // Usar ID del evento o generar uno
        content: (event.payload as any).response,
        sender: 'assistant',
        timestamp: event.timestamp,
        metadata: {
          // Aquí puedes añadir métricas del evento si las tienes
          processingTime: (event.payload as any).duration,
          tools: this.processingStatus.tools, // Enviar las herramientas que se ejecutaron
        },
      });
      // Marcar el procesamiento como finalizado después de enviar la respuesta
      this.processingStatus.phase = 'response_delivered';
      this.processingStatus.status = 'completed'; // O 'inactive'
      if(this.processingStatus.startTime) {
        this.processingStatus.metrics.totalDuration = Date.now() - this.processingStatus.startTime;
      }
      this.postMessageToUI('processingUpdate', this.processingStatus);
    });

    eventBus.on(EventType.CONVERSATION_ENDED, (event: WindsurfEvent) => {
        if (!chatFilter(event)) return;
        const payload = event.payload as ConversationEndedPayload; // Usa el tipo correcto
        this.processingStatus.phase = 'conversation_ended';
        this.processingStatus.status = payload.cleared ? 'inactive' : 'completed'; // Ajustar según si se limpió
        if(this.processingStatus.startTime && (event.payload as any).duration === undefined) {
            (this.processingStatus.metrics as any).totalDuration = Date.now() - this.processingStatus.startTime;
        } else if ((event.payload as any).duration !== undefined) {
            (this.processingStatus.metrics as any).totalDuration = (event.payload as any).duration;
        }
        this.postMessageToUI('processingUpdate', this.processingStatus); // Notificar finalización
        // Si se limpió, la UI podría querer resetearse completamente
        if (payload.cleared) {
            // this.startNewChat(); // Opcional: Iniciar un nuevo chat automáticamente
        }
    });

    eventBus.on(EventType.ERROR_OCCURRED, (event: WindsurfEvent) => {
      // Mostrar errores si son para el chat actual o si no tienen chatId (errores globales)
      if (!chatFilter(event) && (event.payload as any).chatId) return;

      console.error('[WebviewProvider] EventBus: ERROR_OCCURRED', event.payload);
      this.postMessageToUI('systemError', {
        message: (event.payload as any).error || 'An unknown error occurred.',
        source: (event.payload as any).source || 'UnknownSource',
        details: (event.payload as any).stack, // Enviar stack si está disponible
      });
      // Actualizar estado de procesamiento a error
      this.processingStatus.phase = 'error_occurred';
      this.processingStatus.status = 'error';
      // (this.processingStatus.metrics as any).error = (event.payload as any).error;
      this.postMessageToUI('processingUpdate', this.processingStatus);
    });

    // Listeners para TOOL_EXECUTION para actualizar `processingStatus.tools`
    eventBus.on(EventType.TOOL_EXECUTION_STARTED, (event: WindsurfEvent) => {
        if (!chatFilter(event)) return;
        const toolName = (event.payload as any).tool || 'unknown_tool';
        this.processingStatus.tools.push({
            name: toolName,
            status: 'started',
            startTime: event.timestamp,
            parameters: (event.payload as any).parameters
        });
        this.processingStatus.phase = `tool_started:${toolName}`;
        this.postMessageToUI('processingUpdate', this.processingStatus);
    });

    eventBus.on(EventType.TOOL_EXECUTION_COMPLETED, (event: WindsurfEvent) => {
        if (!chatFilter(event)) return;
        const toolName = (event.payload as any).tool || 'unknown_tool';
        const tool = this.processingStatus.tools.find(t => t.name === toolName && t.status === 'started');
        if (tool) {
            tool.status = 'completed';
            tool.endTime = event.timestamp;
            tool.result = (event.payload as any).result;
        }
        this.processingStatus.phase = `tool_completed:${toolName}`;
        this.postMessageToUI('processingUpdate', this.processingStatus);
    });
     eventBus.on(EventType.TOOL_EXECUTION_ERROR, (event: WindsurfEvent) => {
        if (!chatFilter(event)) return;
        const toolName = (event.payload as any).tool || 'unknown_tool';
        const tool = this.processingStatus.tools.find(t => t.name === toolName && t.status === 'started');
        if (tool) {
            tool.status = 'error';
            tool.endTime = event.timestamp;
            tool.error = (event.payload as any).error;
        }
        this.processingStatus.phase = `tool_error:${toolName}`;
        this.postMessageToUI('processingUpdate', this.processingStatus);
    });
  }

  private setupThemeHandler(): void {
    this.postMessageToUI('themeChanged', {
      isDarkMode: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark,
    });
    this.disposables.push(
      vscode.window.onDidChangeActiveColorTheme((theme) => {
        this.postMessageToUI('themeChanged', {
          isDarkMode: theme.kind === vscode.ColorThemeKind.Dark,
        });
      })
    );
  }

  private postMessageToUI(type: string, payload: any): void {
    if (this.view && this.view.webview) {
      console.log('[WebviewProvider] Posting to UI:', { type, payload });
      this.view.webview.postMessage({ type, payload });
    } else {
      console.warn(`[WebviewProvider] Cannot post message. View or webview is not available. Type: ${type}`);
    }
  }

  private generateChatId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  public dispose(): void {
    console.log('[WebviewProvider] Disposing...');
    this.disposables.forEach((d) => d.dispose());
    // Aquí podrías querer desregistrar los listeners del eventBus si es necesario,
    // aunque si EventBus es un singleton y WebviewProvider se destruye,
    // los listeners simplemente no se llamarán.
    // eventBus.off(EventType.RESPONSE_GENERATED, ...); // Necesitarías guardar las referencias de los listeners
  }

  // Métodos que podrían ser llamados desde extension.ts si no se usa `sendMessage` genérico
  // public ensureChatSession(): Promise<void> { /* ... similar a initializeOrRestoreSession ... */ }
  // public sendMessage(type: string, payload: any): void { this.postMessageToUI(type, payload); }
}

// Definición de ProcessingStatus y ToolStatus si no están en otro lugar global
// (Idealmente estarían en un archivo de tipos compartidos si la UI también los necesita así)
interface ToolStatus {
  name: string;
  status: 'started' | 'completed' | 'error';
  startTime: number;
  endTime?: number;
  parameters?: Record<string, any>;
  result?: any;
  error?: string;
}

interface ProcessingStatus {
  phase: string;
  status: 'inactive' | 'active' | 'completed' | 'error';
  startTime?: number;
  tools: ToolStatus[];
  metrics: Record<string, any>;
  // error?: string; // Si quieres un campo de error específico aquí
}