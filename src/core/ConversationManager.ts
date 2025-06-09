// src/core/ConversationManager.ts
import { SimplifiedOptimizedGraphState } from './langgraph/state/GraphState';
import { IConversationManager } from './interfaces/IConversationManager';
import { generateUniqueId } from '../shared/utils/generateIds';
import { Disposable } from './interfaces/Disposable';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { EventType } from '../features/events/eventTypes';
// CAMBIO: Importar la configuración por defecto
import { DEFAULT_ENGINE_CONFIG } from './langgraph/config/EngineConfig';


export class ConversationManager implements IConversationManager, Disposable {
  private activeConversations: Map<string, SimplifiedOptimizedGraphState> = new Map();
  private activeChatId: string | null = null;

  constructor(private dispatcher: InternalEventDispatcher) { }

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
    }


    this.activeChatId = chatId;


    const existingState = this.activeConversations.get(chatId);
    if (existingState) {
      return { state: existingState, isNew: false };
    }


    const currentTime = Date.now();
    const newState: SimplifiedOptimizedGraphState = {
      chatId: chatId,
      userInput: userMessage || '',
      messages: [],
      currentPhase: undefined as any,
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
        ERROR_HANDLER: 0,
      },
      // CAMBIO: Usar valores por defecto seguros.
      maxGraphIterations: DEFAULT_ENGINE_CONFIG.maxGraphIterations,
      maxNodeIterations: DEFAULT_ENGINE_CONFIG.maxNodeIterations,
      startTime: currentTime,
    };


    this.activeConversations.set(chatId, newState);
    return { state: newState, isNew: true };
  }

  public getConversationState(chatId: string): SimplifiedOptimizedGraphState | undefined {
    return this.activeConversations.get(chatId);
  }

  public updateConversationState(chatId: string, state: SimplifiedOptimizedGraphState): void {
    this.activeConversations.set(chatId, state);
  }

  public clearConversation(chatId?: string): boolean {
    const targetChatId = chatId || this.activeChatId;
    if (!targetChatId) return false;

    const wasDeleted = this.activeConversations.delete(targetChatId);

    if (wasDeleted) {
      this.dispatcher.dispatch(EventType.CONVERSATION_ENDED, {
        chatId: targetChatId,
        finalStatus: 'cleared_by_user'
      });
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