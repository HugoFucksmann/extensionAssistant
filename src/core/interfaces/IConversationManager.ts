// src/core/interfaces/IConversationManager.ts
import { WindsurfState } from '../types';
import { MemoryManager } from '../../features/memory/MemoryManager';

export interface IConversationManager {
  // Core conversation methods
  getOrCreateConversationState(chatId?: string, initialUserMessage?: string, contextData?: Record<string, any>): { state: WindsurfState; isNew: boolean };
  getConversationState(chatId: string): WindsurfState | undefined;
  updateConversationState(chatId: string, state: WindsurfState): void;
  clearConversation(chatId?: string, memoryManager?: MemoryManager): boolean;
  
  // Chat management
  generateChatId(): string;
  getActiveChatId(): string | null;
  createNewChat(): string;
  setActiveChatId(chatId: string): boolean;
  getActiveConversationIds(): string[];
}
