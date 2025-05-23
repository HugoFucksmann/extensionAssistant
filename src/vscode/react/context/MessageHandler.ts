// src/ui/handlers/MessageHandler.ts
import { ChatMessage } from '@shared/types';
import { ChatAction } from './state/ChatStateManager';
import { ProcessingAction } from './state/ProcessingStateManager';

export type MessageHandlerCallbacks = {
  dispatchChat: (action: ChatAction) => void;
  dispatchProcessing: (action: ProcessingAction) => void;
  setCurrentModel: (model: string) => void;
  setIsDarkMode: (isDark: boolean) => void;
};

export class MessageHandler {
  constructor(private callbacks: MessageHandlerCallbacks) {}

  handleMessage = (event: MessageEvent<any>) => {
    const { type, payload } = event.data;
    console.log('Received message:', { type, payload });
    
    switch (type) {
      case 'sessionReady':
        this.handleSessionReady(payload);
        break;
      case 'assistantResponse':
        this.handleAssistantResponse(payload);
        break;
      case 'modelSwitched':
        this.callbacks.setCurrentModel(payload.modelType);
        break;
      case 'chatsLoaded':
        this.callbacks.dispatchChat({ type: 'SET_CHAT_LIST', payload: payload.chats });
        break;
      case 'chatLoaded':
        this.callbacks.dispatchChat({ 
          type: 'LOAD_CHAT', 
          payload: { chatId: payload.chatId, messages: payload.messages } 
        });
        break;
      case 'showHistoryView':
        this.callbacks.dispatchChat({ type: 'SET_CHAT_LIST', payload: payload.chats });
        this.callbacks.dispatchChat({ type: 'SET_SHOW_HISTORY', payload: true });
        break;
      case 'newChatStarted':
        this.callbacks.dispatchChat({ 
          type: 'NEW_CHAT', 
          payload: { chatId: payload.chatId } 
        });
        break;
      case 'chatCleared':
        this.callbacks.dispatchChat({ type: 'CLEAR_MESSAGES' });
        break;
      case 'systemError':
        this.handleSystemError(payload);
        break;
      case 'themeChanged':
        this.callbacks.setIsDarkMode(payload.isDarkMode);
        break;
      case 'processingUpdate':
        this.callbacks.dispatchProcessing({ type: 'SET_STATUS', payload });
        break;
      case 'toolExecutionUpdate':
        this.handleToolExecutionUpdate(payload);
        break;
      case 'processingFinished':
        this.handleProcessingFinished(payload);
        break;
      default:
        console.warn('Unhandled message type:', type);
    }
  };

  private handleSessionReady(payload: any) {
    if (payload.chatId) {
      this.callbacks.dispatchChat({ type: 'SET_CURRENT_CHAT_ID', payload: payload.chatId });
    }
    if (payload.messages) {
      this.callbacks.dispatchChat({ type: 'SET_MESSAGES', payload: payload.messages });
    }
  }

  private handleAssistantResponse(payload: any) {
    const message: ChatMessage = {
      id: payload.id || `msg_${Date.now()}`,
     
      content: payload.content || '',
      sender: 'assistant',
      timestamp: payload.timestamp || Date.now(),
      metadata: payload.metadata || {},
    };
    
    this.callbacks.dispatchChat({ type: 'ADD_MESSAGE', payload: message });
    this.callbacks.dispatchChat({ type: 'SET_LOADING', payload: false });
  }

  private handleSystemError(payload: any) {
    const errorMessage: ChatMessage = {
      id: `err_${Date.now()}`,
      content: `Error: ${payload.message || 'Unknown error'}`,
      sender: 'system',
      timestamp: Date.now(),
    
    };
    
    this.callbacks.dispatchChat({ type: 'ADD_MESSAGE', payload: errorMessage });
    this.callbacks.dispatchChat({ type: 'SET_LOADING', payload: false });
    this.callbacks.dispatchProcessing({ type: 'SET_ERROR', payload: payload.message });
  }

  private handleToolExecutionUpdate(payload: any) {
    this.callbacks.dispatchProcessing({
      type: 'UPDATE_TOOL',
      payload: {
        tool: payload.tool,
        status: payload.status,
        data: {
          parameters: payload.parameters,
          result: payload.result,
          error: payload.error,
          startTime: payload.startTime,
          endTime: payload.endTime
        }
      }
    });
  }

  private handleProcessingFinished(payload: any) {
    if (payload.error) {
      this.callbacks.dispatchProcessing({ type: 'SET_ERROR', payload: payload.errorMessage });
    } else {
      this.callbacks.dispatchProcessing({ type: 'SET_PHASE', payload: 'completed' });
    }
    
    // Reset processing status after 3 seconds
    setTimeout(() => {
      this.callbacks.dispatchProcessing({ type: 'RESET_STATUS' });
    }, 3000);
  }
}