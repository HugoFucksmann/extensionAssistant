// src/core/interfaces/IConversationManager.ts
import { WindsurfState, VSCodeContext } from '../../shared/types';
import { MemoryManager } from '../../features/memory/MemoryManager';

export interface IConversationManager {
  getOrCreateConversationState(chatId: string, initialUserMessage: string, contextData: Record<string, any>, vscodeContext: VSCodeContext): WindsurfState;
  getConversationState(chatId: string): WindsurfState | undefined;
  updateConversationState(chatId: string, state: WindsurfState): void;
  endConversation(chatId: string, memoryManager?: MemoryManager): Promise<void>;
  clearConversation(chatId: string, memoryManager: MemoryManager): void;
}

// src/core/interfaces/IWindsurfController.ts
// Define los métodos públicos que expondrá tu controlador
export interface IWindsurfController {
  processUserMessage(chatId: string, userMessage: string, contextData?: Record<string, any>): Promise<string>;
  clearConversation(chatId: string): void;
  dispose(): void;
  // ... otros métodos públicos
}