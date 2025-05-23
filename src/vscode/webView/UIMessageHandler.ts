import { MessageForwarder } from "./MessageForwarder";
import { SessionManager } from "./SessionManager";

export class UIMessageHandler {
    constructor(
      private sessionManager: SessionManager,
      private messageForwarder: MessageForwarder,
      private postMessageToUI: (type: string, payload: any) => void
    ) {}
  
    public async handle(message: any): Promise<void> {
      console.log('[UIMessageHandler] Received:', message);
      
      if (!message || typeof message.type !== 'string') {
        console.warn('[UIMessageHandler] Invalid message:', message);
        return;
      }
  
      switch (message.type) {
        case 'uiReady':
          await this.handleUIReady();
          break;
        
        case 'userMessageSent':
          await this.handleUserMessage(message.payload);
          break;
        
        case 'newChatRequestedByUI':
          this.handleNewChatRequest();
          break;
        
        case 'historyRequestedByUI':
          this.handleHistoryRequest();
          break;
        
        default:
          console.warn(`[UIMessageHandler] Unhandled message type: ${message.type}`);
          this.postMessageToUI('systemError', { 
            message: `Unknown command: ${message.type}` 
          });
      }
    }
  
    private async handleUIReady(): Promise<void> {
      const session = await this.sessionManager.initializeOrRestore();
      this.postMessageToUI('sessionReady', {
        chatId: session.chatId,
        messages: [], // TODO: Load messages if not new
      });
    }
  
    private async handleUserMessage(payload: any): Promise<void> {
      if (!this.sessionManager.isActive() || !this.sessionManager.getCurrentChatId()) {
        this.postMessageToUI('systemError', { 
          message: 'Chat session not active. Please start a new chat.' 
        });
        return;
      }
  
      if (!payload || typeof payload.text !== 'string') {
        this.postMessageToUI('systemError', { 
          message: 'Invalid user message payload.' 
        });
        return;
      }
  
      // Signal processing start
      this.postMessageToUI('processingUpdate', {
        phase: 'processing_user_message',
        status: 'active',
        startTime: Date.now()
      });
  
      await this.messageForwarder.forwardUserMessageToController(
        this.sessionManager.getCurrentChatId()!,
        payload.text,
        payload.files || []
      );
    }
  
    private handleNewChatRequest(): void {
      const chatId = this.sessionManager.startNewChat();
      this.postMessageToUI('newChatStarted', { chatId });
    }
  
    private handleHistoryRequest(): void {
      // This would typically call a method on WebviewProvider
      // or be handled by a separate HistoryManager
      console.log('[UIMessageHandler] History request - delegating to parent');
    }
  }