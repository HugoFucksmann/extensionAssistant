// src/core/ConversationManager.ts
import { ExecutionState } from './execution/ExecutionState';
import { IConversationManager } from './interfaces/IConversationManager';
import { generateUniqueId } from '../shared/utils/generateIds';
import { Disposable } from './interfaces/Disposable';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { EventType } from '../features/events/eventTypes';
import { ExecutionMode } from './execution/ExecutionEngine';

interface ConversationState {
  chatId: string;
  userInput: string;
  isCompleted: boolean;
  error?: string;
  finalResponse?: string;
  executionState: ExecutionState;
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

    const newState = this.createInitialConversationState(chatId, userMessage, contextData);
    this.activeConversations.set(chatId, newState);
    return { state: newState, isNew: true };
  }

  public getConversationState(chatId: string): ConversationState | undefined {
    return this.activeConversations.get(chatId);
  }

  public updateConversationState(chatId: string, updates: Partial<ConversationState>): void {
    const existingState = this.activeConversations.get(chatId);
    if (!existingState) {
      throw new Error(`No conversation state found for chatId: ${chatId}`);
    }

    const updatedState: ConversationState = {
      ...existingState,
      ...updates,
      updatedAt: new Date()
    };

    this.activeConversations.set(chatId, updatedState);
  }

  public updateExecutionState(chatId: string, executionUpdates: Partial<ExecutionState>): void {
    const conversationState = this.activeConversations.get(chatId);
    if (!conversationState) {
      throw new Error(`No conversation state found for chatId: ${chatId}`);
    }

    const updatedExecutionState: ExecutionState = {
      ...conversationState.executionState,
      ...executionUpdates,
      updatedAt: new Date()
    };

    this.updateConversationState(chatId, {
      executionState: updatedExecutionState
    });
  }

  public clearConversation(chatId?: string): boolean {
    const targetChatId = chatId || this.activeChatId;
    if (!targetChatId) return false;

    const wasDeleted = this.activeConversations.delete(targetChatId);

    if (wasDeleted) {
      const endedPayload: Omit<import('../features/events/eventTypes').ConversationEndedPayload, 'timestamp'> = {
        chatId: targetChatId,
        finalStatus: 'cleared_by_user'
      };
      this.dispatcher.dispatch(EventType.CONVERSATION_ENDED, endedPayload);
    }

    if (targetChatId === this.activeChatId) {
      this.activeChatId = null;
    }

    return wasDeleted;
  }

  public getActiveConversationIds(): string[] {
    return Array.from(this.activeConversations.keys());
  }

  private createInitialConversationState(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any>
  ): ConversationState {
    const currentTime = new Date();

    return {
      chatId,
      userInput: userMessage,
      isCompleted: false,
      createdAt: currentTime,
      updatedAt: currentTime,
      executionState: this.createInitialExecutionState(chatId, contextData)
    };
  }

  private createInitialExecutionState(
    sessionId: string,
    contextData: Record<string, any>
  ): ExecutionState {
    const currentTime = new Date();

    return {
      sessionId,
      mode: (contextData.executionMode as ExecutionMode) || 'simple',
      step: 0,
      lastResult: null,
      errorCount: 0,
      createdAt: currentTime,
      updatedAt: currentTime,
      executionStatus: 'planning',
      progress: 0,
      currentQuery: contextData.userMessage || '',
      workspaceFiles: contextData.workspaceFiles || contextData.files || [],
      activeFile: contextData.activeFile,
      userContext: contextData,
      recoveryAttempts: 0,
      maxRecoveryAttempts: 3
    };
  }

  public dispose(): void {
    this.activeConversations.clear();
    this.activeChatId = null;
  }
}