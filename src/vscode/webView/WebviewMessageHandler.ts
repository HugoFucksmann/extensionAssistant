import { ApplicationLogicService } from '../../core/ApplicationLogicService';
import { WebviewStateManager } from './WebviewStateManager';
import { IConversationManager } from '../../core/interfaces/IConversationManager';

export class WebviewMessageHandler {
  private currentChatId: string | null = null;

  constructor(
    private readonly appLogicService: ApplicationLogicService,
    private readonly conversationManager: IConversationManager,
    private readonly stateManager: WebviewStateManager,
    private readonly postMessage: (type: string, payload: any) => void
  ) {}

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
        break;
    }
  }

  private async handleUIReady(): Promise<void> {
    // Initialize a new chat if none exists
    if (!this.conversationManager.getActiveChatId()) {
      this.currentChatId = this.conversationManager.createNewChat();
    } else {
      this.currentChatId = this.conversationManager.getActiveChatId();
    }
    
    this.postMessage('sessionReady', {
      chatId: this.currentChatId,
      messages: [],
    });
  }

  private async handleUserMessage(payload: { text: string; files?: string[] }): Promise<void> {
    if (!this.currentChatId) {
      this.currentChatId = this.conversationManager.createNewChat();
    }
    
    const chatId = this.currentChatId;
    if (!chatId) {
      this.postMessage('systemError', { message: 'Failed to create or retrieve chat session' });
      return;
    }

    if (!payload.text?.trim()) {
      this.postMessage('systemError', { message: 'Message cannot be empty' });
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
        this.postMessage('systemError', { 
          message: errorMessage,
        });
      } 
    } catch (error: any) {
      console.error('[WebviewMessageHandler] Critical error processing message:', error);
      this.postMessage('systemError', { 
        message: error.message || 'An unexpected critical error occurred',
      });
    }
  }

  /**
   * Handles the creation of a new chat
   * @public
   */
  public handleNewChatRequest(): void {
    try {
      // Create a new chat and get its ID
      const newChatId = this.conversationManager.createNewChat();
      this.currentChatId = newChatId;
      
      // Notify the UI that a new chat was started
      this.postMessage('newChatStarted', { 
        chatId: newChatId,
        activeChatId: this.conversationManager.getActiveChatId()
      });
    } catch (error) {
      console.error('[WebviewMessageHandler] Error creating new chat:', error);
      this.postMessage('systemError', {
        message: 'Failed to create a new chat. Please try again.'
      });
    }
  }

  private async handleCommand(payload: any): Promise<void> {
   

    if (payload?.command === 'getProjectFiles') {
      await this.handleGetProjectFiles();
    }
  }

  private async handleGetProjectFiles(): Promise<void> {
    if (!this.currentChatId) {
      this.currentChatId = this.conversationManager.createNewChat();
    }
    
    const chatId = this.currentChatId;
    if (!chatId) {
      this.postMessage('systemError', { message: 'Failed to create or retrieve chat session for tool execution.' });
      return;
    }

    try {
    
      const { listFilesUtil } = await import('../../shared/utils/listFiles');
      const files = await listFilesUtil(require('vscode'), '**/*');
      const filePaths = files.filter(f => f.type === 'file').map(f => f.path);
      this.postMessage('projectFiles', { files: filePaths });
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to list project files';
      console.error('[WebviewMessageHandler] Error getting project files:', errorMsg);
      this.postMessage('systemError', { message: errorMsg });
    }
  }

  private async handleSwitchModel(payload: { modelType: string }): Promise<void> {
    try {
      if (!payload?.modelType) {
        this.postMessage('systemError', { message: 'No model type specified' });
        return;
      }
    
      const { ComponentFactory } = await import('../../core/ComponentFactory');
      const modelManager = ComponentFactory.getModelManager();
      modelManager.setActiveProvider(payload.modelType as 'gemini' | 'ollama');
    
      if (typeof this.stateManager.setCurrentModel === 'function') {
        this.stateManager.setCurrentModel(payload.modelType);
      }
      this.postMessage('modelSwitched', { modelType: payload.modelType });
      
    } catch (error: any) {
      console.error('[WebviewMessageHandler] Error switching model:', error);
      this.postMessage('systemError', { message: error.message || 'Failed to switch model' });
    }
  }
}