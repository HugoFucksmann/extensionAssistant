// src/core/ConversationManager.ts
import { WindsurfState } from './types';
import { HistoryEntry } from '../features/chat/types';
import { MemoryManager } from '../features/memory/MemoryManager';
import { getConfig } from '../shared/config';
import { IConversationManager } from './interfaces/IConversationManager';
import { generateUniqueId } from '../shared/utils/generateIds';

const config = getConfig(process.env.NODE_ENV === 'production' ? 'production' : 'development');
const reactConfig = config.backend.react;

import { Disposable } from './interfaces/Disposable';

export class ConversationManager implements IConversationManager, Disposable {
  private activeConversations: Map<string, WindsurfState> = new Map();
  private activeChatId: string | null = null;


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
  ): { state: WindsurfState; isNew: boolean } {

    if (!chatId) {
      chatId = this.createNewChat();
    } else if (!this.activeConversations.has(chatId)) {

      this.activeChatId = chatId;
    } else {

      this.activeChatId = chatId;
    }
    let state = this.activeConversations.get(chatId);
    const currentTime = Date.now();
    let isNew = false;

    if (state) {

      state.userMessage = userMessage;
      state.objective = userMessage ? `Responder a: ${userMessage.substring(0, 100)}...` : state.objective;
      state.iterationCount = 0;
      state.completionStatus = 'in_progress';
      state.error = undefined;
      state.reasoningResult = undefined;
      state.actionResult = undefined;
      state.reflectionResult = undefined;
      state.correctionResult = undefined;
      state.finalOutput = undefined;
      state.timestamp = currentTime;

      if (userMessage) {
        const userHistoryEntry: HistoryEntry = {
          phase: 'user_input',
          content: userMessage,
          timestamp: currentTime,
          iteration: 0,
          metadata: {
            status: 'success',
          },
        };
        state.history = state.history || [];
        state.history.push(userHistoryEntry);
      }

      if (contextData.projectContext) state.projectContext = contextData.projectContext;
      if (contextData.editorContext) state.editorContext = contextData.editorContext;

      this.activeConversations.set(chatId, state);
      return { state, isNew };
    }


    isNew = true;

    const newState: WindsurfState = {
      objective: userMessage ? `Responder a: ${userMessage.substring(0, 100)}...` : 'Nueva conversación',
      userMessage: userMessage,
      chatId: chatId,
      iterationCount: 0,
      maxIterations: reactConfig.maxIterations,
      completionStatus: 'in_progress',
      history: userMessage ? [{
        phase: 'user_input',
        content: userMessage,
        timestamp: currentTime,
        iteration: 0,
        metadata: { status: 'success' },
      }] : [],
      projectContext: contextData.projectContext,
      editorContext: contextData.editorContext,
      timestamp: currentTime,
    };

    this.activeConversations.set(chatId, newState);
    return { state: newState, isNew };
  }

  public getConversationState(chatId: string): WindsurfState | undefined {
    return this.activeConversations.get(chatId);
  }

  public updateConversationState(chatId: string, state: WindsurfState): void {

    state.timestamp = Date.now();
    this.activeConversations.set(chatId, state);

  }




  public clearConversation(chatId?: string, memoryManager?: MemoryManager): boolean {
    const targetChatId = chatId || this.activeChatId;
    if (!targetChatId) return false;

    const wasDeleted = this.activeConversations.delete(targetChatId);

    if (memoryManager && wasDeleted) {
      memoryManager.clearRuntime(targetChatId);
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