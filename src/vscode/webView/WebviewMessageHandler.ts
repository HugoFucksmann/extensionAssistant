// src/vscode/webView/WebviewMessageHandler.ts
import { ApplicationLogicService } from '../../core/ApplicationLogicService';
import { WebviewStateManager } from './WebviewStateManager';
import { IConversationManager } from '../../core/interfaces/IConversationManager';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher'; 
import { EventType, SystemEventPayload, } from '../../features/events/eventTypes'; 

export class WebviewMessageHandler {
  private currentChatId: string | null = null;

  private internalEventDispatcher: InternalEventDispatcher;

  constructor(
    private readonly appLogicService: ApplicationLogicService,
    private readonly conversationManager: IConversationManager,
    private readonly stateManager: WebviewStateManager,
    private readonly postMessage: (type: string, payload: any) => void,
    internalEventDispatcher: InternalEventDispatcher,
    /**
     * Referencia al event handler para sincronizar el chat activo
     */
    private readonly eventHandler?: { setCurrentChatId: (chatId: string) => void }
  ) {
    this.internalEventDispatcher = internalEventDispatcher;
  }

  

  private dispatchSystemError(message: string, source: string, details?: Record<string, any>): void {
    const payload: SystemEventPayload = {
      message,
      level: 'error',
      chatId: this.currentChatId || undefined, 
      source: `WebviewMessageHandler.${source}`,
      timestamp: Date.now(),
      details,
    };
    this.internalEventDispatcher.dispatch(EventType.SYSTEM_ERROR, payload);
  }

  public async handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'uiReady':
        await this.handleUIReady();
        break;
      case 'userMessageSent':
        await this.handleUserMessage(message.payload);
        break;
      case 'switchModel':
        await this.handleSwitchModel(message.payload);
        break;
      case 'newChatRequestedByUI':
        this.handleNewChatRequest();
        break;
      case 'command':
        await this.handleCommand(message.payload);
        break;
      default:
        console.warn('[WebviewMessageHandler] Unknown message type:', message.type);
        // Podrías incluso despachar un error aquí si es un tipo desconocido no esperado
        // this.dispatchSystemError(`Unknown message type received: ${message.type}`, 'handleMessage');
        break;
    }
  }

  private async handleUIReady(): Promise<void> {
    if (!this.conversationManager.getActiveChatId()) {
      this.currentChatId = this.conversationManager.createNewChat();
    } else {
      this.currentChatId = this.conversationManager.getActiveChatId();
    }
    // Sincronizar con el event handler si existe
    if (this.eventHandler && typeof this.eventHandler.setCurrentChatId === 'function') {
      this.eventHandler.setCurrentChatId(this.currentChatId!);
    }
    if (!this.currentChatId) { // Doble chequeo por si createNewChat fallara hipotéticamente
        this.dispatchSystemError('Failed to initialize chat session on UI ready.', 'handleUIReady');
        return;
    }

    this.postMessage('sessionReady', {
      chatId: this.currentChatId,
      messages: [], // La UI debería cargar mensajes del historial si es necesario
    });
  }

  private async handleUserMessage(payload: { text: string; files?: string[] }): Promise<void> {
    if (!this.currentChatId) {
      // Intenta crear uno si no existe, pero si falla, es un error
      this.currentChatId = this.conversationManager.createNewChat();
      if (!this.currentChatId) {
        this.dispatchSystemError('Failed to create or retrieve chat session for user message.', 'handleUserMessage');
        return;
      }
    }
    // Sincronizar con el event handler si existe
    if (this.eventHandler && typeof this.eventHandler.setCurrentChatId === 'function') {
      this.eventHandler.setCurrentChatId(this.currentChatId!);
    }
    const chatId = this.currentChatId; // Ya no puede ser null aquí si la lógica anterior es correcta

    if (!payload.text?.trim()) {
      this.dispatchSystemError('Message cannot be empty.', 'handleUserMessage');
      return;
    }

    try {
      const result = await this.appLogicService.processUserMessage(
        chatId,
        payload.text,
        { files: payload.files || [] }
      );

      if (!result.success) {
        const errorMessage = result.error || 'Processing failed to produce a response.';
        // Este error es del ApplicationLogicService, podría ser un SYSTEM_ERROR o un tipo más específico
        // Por ahora, lo trataremos como un error del sistema que se muestra en la UI.
        this.dispatchSystemError(errorMessage, 'handleUserMessage (appLogicService.processUserMessage)', {
            originalError: result.error, // Para más contexto si es necesario
            updatedStateError: result.updatedState?.error
        });
      } 
      // Si es success, el feedback de la respuesta del asistente vendrá por RESPONSE_GENERATED
    } catch (error: any) {
      console.error('[WebviewMessageHandler] Critical error processing message:', error);
      this.dispatchSystemError(
        error.message || 'An unexpected critical error occurred during message processing.',
        'handleUserMessage (catch)',
        { stack: error.stack }
      );
    }
  }

  public handleNewChatRequest(): void {
    try {
      const newChatId = this.conversationManager.createNewChat();
      this.currentChatId = newChatId;
      // Sincronizar con el event handler si existe
      if (this.eventHandler && typeof this.eventHandler.setCurrentChatId === 'function') {
        this.eventHandler.setCurrentChatId(newChatId);
      }
      this.postMessage('newChatStarted', { 
        chatId: newChatId,
        activeChatId: this.conversationManager.getActiveChatId() // Esto es bueno para la UI
      });
    } catch (error: any) {
      console.error('[WebviewMessageHandler] Error creating new chat:', error);
      this.dispatchSystemError(
        error.message || 'Failed to create a new chat. Please try again.',
        'handleNewChatRequest',
        { stack: error.stack }
      );
    }
  }

  private async handleCommand(payload: any): Promise<void> {
    if (payload?.command === 'getProjectFiles') {
      await this.handleGetProjectFiles();
    }
    // Añadir más comandos si es necesario
  }

  private async handleGetProjectFiles(): Promise<void> {
    if (!this.currentChatId) {
      this.currentChatId = this.conversationManager.createNewChat();
      if (!this.currentChatId) {
          this.dispatchSystemError('Failed to create or retrieve chat session for getProjectFiles.', 'handleGetProjectFiles');
          return;
      }
    }
    
    // const chatId = this.currentChatId; // No se usa directamente aquí, pero el dispatcher sí

    try {
      const { listFilesUtil } = await import('../../shared/utils/listFiles');
      const files = await listFilesUtil(require('vscode'), '**/*');
      const filePaths = files.filter(f => f.type === 'file').map(f => f.path);
      this.postMessage('projectFiles', { files: filePaths }); // Esto es un mensaje de datos, no un error.
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to list project files';
      console.error('[WebviewMessageHandler] Error getting project files:', errorMsg);
      this.dispatchSystemError(errorMsg, 'handleGetProjectFiles', { stack: error.stack });
    }
  }

  private async handleSwitchModel(payload: { modelType: string }): Promise<void> {
    try {
      if (!payload?.modelType) {
        this.dispatchSystemError('No model type specified for switching.', 'handleSwitchModel');
        return;
      }
    
      const { ComponentFactory } = await import('../../core/ComponentFactory');
      const modelManager = ComponentFactory.getModelManager();
      modelManager.setActiveProvider(payload.modelType as 'gemini' | 'ollama'); // Asumimos que setActiveProvider maneja errores internos si el modelo no es válido
    
      if (typeof this.stateManager.setCurrentModel === 'function') {
        this.stateManager.setCurrentModel(payload.modelType);
      }
      this.postMessage('modelSwitched', { modelType: payload.modelType }); // Esto es un mensaje de estado, no un error.
      
    } catch (error: any) {
      console.error('[WebviewMessageHandler] Error switching model:', error);
      this.dispatchSystemError(
        error.message || 'Failed to switch model.',
        'handleSwitchModel',
        { stack: error.stack }
      );
    }
  }

  
}