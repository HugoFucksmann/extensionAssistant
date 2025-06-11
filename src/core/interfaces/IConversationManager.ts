// src/core/interfaces/IConversationManager.ts
import { SimplifiedOptimizedGraphState } from '../langgraph/state/GraphState';

export interface IConversationManager {

  // CAMBIO: Se eliminaron los parámetros 'initialUserMessage' y 'contextData' que no se usaban.
  getOrCreateConversationState(chatId?: string): { state: SimplifiedOptimizedGraphState; isNew: boolean };
  getConversationState(chatId: string): SimplifiedOptimizedGraphState | undefined;
  updateConversationState(chatId: string, state: SimplifiedOptimizedGraphState): void;

  generateChatId(): string;
  getActiveChatId(): string | null;
  createNewChat(): string;
  setActiveChatId(chatId: string): boolean;
  getActiveConversationIds(): string[];
}