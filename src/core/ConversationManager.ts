// src/core/ConversationManager.ts
import { SimplifiedOptimizedGraphState } from './langgraph/state/GraphState';
import { HistoryEntry } from '../features/chat/types';
import { MemoryManager } from '../features/memory/MemoryManager';
import { IConversationManager } from './interfaces/IConversationManager';
import { generateUniqueId } from '../shared/utils/generateIds';
import { Disposable } from './interfaces/Disposable';


export class ConversationManager implements IConversationManager, Disposable {
  private activeConversations: Map<string, SimplifiedOptimizedGraphState> = new Map();
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
  ): { state: SimplifiedOptimizedGraphState; isNew: boolean } {

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

      this.activeConversations.set(chatId, state);
      return { state, isNew };
    }


    isNew = true;

    const newState: SimplifiedOptimizedGraphState = {
      chatId: chatId,
      userInput: userMessage || '',
      messages: [],
      currentPhase: undefined as any, // Debe ser GraphPhase, se debe inicializar según lógica de negocio.
      currentPlan: [],
      toolsUsed: [],
      workingMemory: '',
      retrievedMemory: '',
      requiresValidation: false,
      isCompleted: false,
      iteration: 0,
      nodeIterations: {
        ANALYSIS: 0,
        EXECUTION: 0,
        VALIDATION: 0,
        RESPONSE: 0,
        COMPLETED: 0,
        ERROR: 0,
      },
      maxGraphIterations: 0,
      maxNodeIterations: {},
      startTime: currentTime,
    };

    this.activeConversations.set(chatId, newState);
    return { state: newState, isNew };
  }

  public getConversationState(chatId: string): SimplifiedOptimizedGraphState | undefined {
    return this.activeConversations.get(chatId);
  }

  public updateConversationState(chatId: string, state: SimplifiedOptimizedGraphState): void {


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