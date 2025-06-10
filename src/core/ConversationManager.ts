// src/core/ConversationManager.ts
import { ExecutionState } from './execution/ExecutionState';
import { IConversationManager } from './interfaces/IConversationManager';
import { generateUniqueId } from '../shared/utils/generateIds';
import { Disposable } from './interfaces/Disposable';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { EventType } from '../features/events/eventTypes';

interface ConversationState {
  chatId: string;
  userInput: string;
  isCompleted: boolean;
  error?: string;
  finalResponse?: string;
  executionState?: ExecutionState;
  createdAt: Date;
  updatedAt: Date;
}

export class ConversationManager implements IConversationManager, Disposable {
  private activeConversations: Map<string, ConversationState> = new Map();
  private activeChatId: string | null = null;

  constructor(private dispatcher: InternalEventDispatcher) { }

  public generateChatId(): string {
    return `chat_${generateUniqueId()}`;
  }

  public getActiveChatId(): string | null {
    return this.activeChatId;
  }

  public createNewChat(): string {
    this.activeChatId = this.generateChatId();
    return this.activeChatId;
  }

  public setActiveChatId(chatId: string): boolean {
    if (this.activeConversations.has(chatId)) {
      this.activeChatId = chatId;
      return true;
    }
    return false;
  }

  public getOrCreateConversationState(
    chatId?: string,
    userMessage: string = '',
    contextData: Record<string, any> = {},
  ): { state: ConversationState; isNew: boolean } {

    if (!chatId) {
      chatId = this.createNewChat();
    }

    this.activeChatId = chatId;

    const existingState = this.activeConversations.get(chatId);
    if (existingState) {
      return { state: existingState, isNew: false };
    }

    const currentTime = new Date();
    const newState: ConversationState = {
      chatId: chatId,
      userInput: userMessage || '',
      isCompleted: false,
      createdAt: currentTime,
      updatedAt: currentTime,
      executionState: {
        sessionId: chatId,
        mode: 'simple',
        step: 0,
        lastResult: null,
        errorCount: 0,
        createdAt: currentTime,
        updatedAt: currentTime,
        progress: 0,
        executionStatus: 'planning'
      }
    };

    this.activeConversations.set(chatId, newState);
    return { state: newState, isNew: true };
  }

  public getConversationState(chatId: string): ConversationState | undefined {
    return this.activeConversations.get(chatId);
  }

  public updateConversationState(chatId: string, state: ConversationState): void {
    const updatedState = {
      ...state,
      updatedAt: new Date()
    };
    this.activeConversations.set(chatId, updatedState);
  }

  public clearConversation(chatId?: string): boolean {
    const targetChatId = chatId || this.activeChatId;
    if (!targetChatId) return false;

    const wasDeleted = this.activeConversations.delete(targetChatId);

    if (wasDeleted) {
      this.dispatcher.dispatch(EventType.CONVERSATION_ENDED, {
        chatId: targetChatId,
        finalStatus: 'cleared_by_user'
      });
    }

    if (targetChatId === this.activeChatId) {
      this.activeChatId = null;
    }

    return wasDeleted;
  }

  public getActiveConversationIds(): string[] {
    return Array.from(this.activeConversations.keys());
  }

  public dispose(): void {
    this.activeConversations.clear();
    this.activeChatId = null;
  }
}