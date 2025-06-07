// src/core/interfaces/IConversationManager.ts
import { SimplifiedOptimizedGraphState } from '../langgraph/state/GraphState';
import { MemoryManager } from '../../features/memory/MemoryManager';

export interface IConversationManager {
  // Core conversation methods
  getOrCreateConversationState(chatId?: string, initialUserMessage?: string, contextData?: Record<string, any>): { state: SimplifiedOptimizedGraphState; isNew: boolean };
  getConversationState(chatId: string): SimplifiedOptimizedGraphState | undefined;
  updateConversationState(chatId: string, state: SimplifiedOptimizedGraphState): void;
  clearConversation(chatId?: string, memoryManager?: MemoryManager): boolean;
  
  // Chat management
  generateChatId(): string;
  getActiveChatId(): string | null;
  createNewChat(): string;
  setActiveChatId(chatId: string): boolean;
  getActiveConversationIds(): string[];
}
