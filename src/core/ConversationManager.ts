// src/core/ConversationManager.ts
import { WindsurfState } from './types';
import { HistoryEntry } from '../features/chat/types';
import { ConversationMemoryManager } from '../features/memory/ConversationMemoryManager';
import { getConfig } from '../shared/config';
import { IConversationManager } from './interfaces/IConversationManager';
import * as crypto from 'crypto';

const config = getConfig(process.env.NODE_ENV === 'production' ? 'production' : 'development');

export class ConversationManager implements IConversationManager {
  private activeConversations: Map<string, WindsurfState> = new Map();
  private activeChatId: string | null = null;

  /**
   * Generates a new unique chat ID
   */
  public generateChatId(): string {
    return `chat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Gets the currently active chat ID
   */
  public getActiveChatId(): string | null {
    return this.activeChatId;
  }

  /**
   * Creates a new chat session
   */
  public createNewChat(): string {
    this.activeChatId = this.generateChatId();
    return this.activeChatId;
  }

  /**
   * Sets the active chat ID
   */
  public setActiveChatId(chatId: string): boolean {
    if (this.activeConversations.has(chatId)) {
      this.activeChatId = chatId;
      return true;
    }
    return false;
  }

  /**
   * Gets or creates a conversation state for the given chat ID
   * If no chatId is provided, creates a new conversation
   */
  public getOrCreateConversationState(
    chatId?: string,
    userMessage: string = '',
    contextData: Record<string, any> = {},
  ): { state: WindsurfState; isNew: boolean } {
    // If no chatId is provided, create a new conversation
    if (!chatId) {
      chatId = this.createNewChat();
    } else if (!this.activeConversations.has(chatId)) {
      // If chatId is provided but doesn't exist, create it
      this.activeChatId = chatId;
    } else {
      // Existing conversation
      this.activeChatId = chatId;
    }
        let state = this.activeConversations.get(chatId);
    const currentTime = Date.now();
    let isNew = false;

    if (state) {
      // Update existing conversation
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

    // Create new conversation
    isNew = true;
    
    const newState: WindsurfState = {
      objective: userMessage ? `Responder a: ${userMessage.substring(0, 100)}...` : 'Nueva conversación',
      userMessage: userMessage,
      chatId: chatId,
      iterationCount: 0,
      maxIterations: config.backend.react.maxIterations,
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

  public getConversationState(chatId:string): WindsurfState | undefined {
    return this.activeConversations.get(chatId);
  }

  public updateConversationState(chatId: string, state: WindsurfState): void {
   
    state.timestamp = Date.now();
    this.activeConversations.set(chatId, state);
   
  }



  /**
   * Clears a conversation and optionally its memory
   * If no chatId is provided, clears the active conversation
   */
  public clearConversation(chatId?: string, conversationMemoryManager?: ConversationMemoryManager): boolean {
    const targetChatId = chatId || this.activeChatId;
    if (!targetChatId) return false;
    
    const wasDeleted = this.activeConversations.delete(targetChatId);
    
    if (conversationMemoryManager && wasDeleted) {
      conversationMemoryManager.clearConversationMemory(targetChatId);
    }
    
    // Reset active chat ID if we're clearing the current one
    if (targetChatId === this.activeChatId) {
      this.activeChatId = null;
    }
    
    return wasDeleted;
  }
  
  /**
   * Gets all active conversation IDs
   */
  public getActiveConversationIds(): string[] {
    return Array.from(this.activeConversations.keys());
  }
}