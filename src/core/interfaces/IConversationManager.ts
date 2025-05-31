// src/core/interfaces/IConversationManager.ts
import { WindsurfState, VSCodeContext } from '../../shared/types';
import { MemoryManager } from '../../features/memory/MemoryManager';

export interface IConversationManager {
  getOrCreateConversationState(chatId: string, initialUserMessage: string, contextData: Record<string, any>, vscodeContext: VSCodeContext): WindsurfState;
  getConversationState(chatId: string): WindsurfState | undefined;
  updateConversationState(chatId: string, state: WindsurfState): void;
  clearConversation(chatId: string, memoryManager: MemoryManager): void;
}


