import { ApplicationLogicService } from '../../core/ApplicationLogicService';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import { EventType } from '../../features/events/eventTypes';
import { WebviewStateManager } from './WebviewStateManager';

export class WebviewMessageHandler {
  constructor(
    private readonly appLogicService: ApplicationLogicService,
    private readonly internalEventDispatcher: InternalEventDispatcher,
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
      case 'permissionResponse':
        this.handlePermissionResponse(message.payload);
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
    this.stateManager.initializeChat();
    console.log(`[WebviewMessageHandler DEBUG] UI Ready. New Chat ID: ${this.stateManager.getCurrentChatId()}`);
    
    this.postMessage('sessionReady', {
      chatId: this.stateManager.getCurrentChatId(),
      messages: [],
      testMode: this.stateManager.isTestModeEnabled()
    });
  }

  private async handleUserMessage(payload: { text: string; files?: string[] }): Promise<void> {
    const chatId = this.stateManager.getCurrentChatId();
    if (!chatId) {
      this.postMessage('systemError', { message: 'No active chat session' });
      return;
    }

    if (!payload.text?.trim()) {
      this.postMessage('systemError', { message: 'Message cannot be empty' });
      return;
    }

    const operationId = this.stateManager.startNewOperation();
    console.log(`[WebviewMessageHandler DEBUG] Starting handleUserMessage. ChatID: ${chatId}, OpID: ${operationId}`);

    this.postMessage('processingStarted', { operationId });

    try {
      const result = await this.appLogicService.processUserMessage(
        chatId,
        payload.text,
        { files: payload.files || [] }
      );

      console.log(`[WebviewMessageHandler DEBUG] processUserMessage result for OpID ${operationId}:`, 
        JSON.stringify(result).substring(0, 200));

      if (!result.success) {
        const errorMessage = result.error || 'Processing failed to produce a response.';
        this.postMessage('systemError', { 
          message: errorMessage,
          operationId 
        });
      } else {
        console.log(`[WebviewMessageHandler DEBUG] processUserMessage successful. OpID: ${operationId}`);
      }
    } catch (error: any) {
      console.error('[WebviewMessageHandler] Critical error processing message:', error);
      this.postMessage('systemError', { 
        message: error.message || 'An unexpected critical error occurred',
        operationId 
      });
    } finally {
      this.postMessage('processingFinished', { operationId });
      this.stateManager.clearCurrentOperation();
    }
  }

  private handlePermissionResponse(payload: any): void {
    console.log(`[WebviewMessageHandler DEBUG] Permission response received:`, payload);
    
    this.internalEventDispatcher.dispatch(EventType.USER_INPUT_RECEIVED, {
      uiOperationId: payload.operationId,
      value: payload.allowed,
      wasCancelled: !payload.allowed,
      chatId: this.stateManager.getCurrentChatId() || undefined
    });
  }

  private handleNewChatRequest(): void {
    this.stateManager.startNewChat();
    console.log(`[WebviewMessageHandler DEBUG] newChatRequestedByUI. New Chat ID: ${this.stateManager.getCurrentChatId()}`);
    this.postMessage('newChatStarted', { chatId: this.stateManager.getCurrentChatId() });
  }

  private async handleCommand(payload: any): Promise<void> {
    console.log(`[WebviewMessageHandler DEBUG] Received command:`, payload?.command);

    if (payload?.command === 'toggleTestMode') {
      console.log(`[WebviewMessageHandler DEBUG] toggleTestMode command received from UI`);
    } else if (payload?.command === 'getProjectFiles') {
      await this.handleGetProjectFiles();
    }
  }

  private async handleGetProjectFiles(): Promise<void> {
    const chatId = this.stateManager.getCurrentChatId();
    if (!chatId) {
      this.postMessage('systemError', { message: 'No active chat session to associate with tool execution.' });
      return;
    }

    try {
      const result = await this.appLogicService.invokeTool(
        'listFiles',
        { pattern: '**/*' },
        { chatId }
      );

      if (result.success && result.data?.files) {
        const filePaths = (result.data.files as Array<{ path: string; type: string }>)
          .filter(f => f.type === 'file')
          .map(f => f.path);

        this.postMessage('projectFiles', { files: filePaths });
      } else {
        const errorMsg = result.error || 'Failed to list project files';
        console.error('[WebviewMessageHandler] Error getting project files:', errorMsg);
        this.postMessage('systemError', { message: errorMsg });
      }
    } catch (error: any) {
      console.error('[WebviewMessageHandler] Error in getProjectFiles handler:', error);
      this.postMessage('systemError', { message: error.message || 'Failed to list project files' });
    }
  }
}