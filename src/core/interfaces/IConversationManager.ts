// src/core/interfaces/IConversationManager.ts
import { ExecutionState } from '../execution/ExecutionState';

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

export interface IConversationManager {

  getOrCreateConversationState(chatId?: string, initialUserMessage?: string, contextData?: Record<string, any>): { state: ConversationState; isNew: boolean };
  getConversationState(chatId: string): ConversationState | undefined;
  updateConversationState(chatId: string, updates: Partial<ConversationState>): void;
  updateExecutionState(chatId: string, executionUpdates: Partial<ExecutionState>): void;


  generateChatId(): string;
  getActiveChatId(): string | null;
  createNewChat(): string;
  setActiveChatId(chatId: string): boolean;
  getActiveConversationIds(): string[];
}