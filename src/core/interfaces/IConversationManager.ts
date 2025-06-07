// src/core/interfaces/IConversationManager.ts
import { SimplifiedOptimizedGraphState } from '../langgraph/state/GraphState';


export interface IConversationManager {
  // Core conversation methods
  getOrCreateConversationState(chatId?: string, initialUserMessage?: string, contextData?: Record<string, any>): { state: SimplifiedOptimizedGraphState; isNew: boolean };
  getConversationState(chatId: string): SimplifiedOptimizedGraphState | undefined;
  updateConversationState(chatId: string, state: SimplifiedOptimizedGraphState): void;

  // Chat management
  generateChatId(): string;
  getActiveChatId(): string | null;
  createNewChat(): string;
  setActiveChatId(chatId: string): boolean;
  getActiveConversationIds(): string[];
}
