// src/core/ConversationManager.ts
import { WindsurfState, VSCodeContext, HistoryEntry } from '../shared/types'; // Importa HistoryEntry
import { MemoryManager } from '../features/memory/MemoryManager';
import { getConfig  } from '../shared/config';
import { IConversationManager } from './interfaces/IConversationManager';

const config = getConfig(process.env.NODE_ENV === 'production' ? 'production' : 'development');

export class ConversationManager implements IConversationManager {
  private activeConversations: Map<string, WindsurfState> = new Map();

  constructor() {
    console.log('[ConversationManager] Initialized');
  }

  public getOrCreateConversationState(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any> = {},
    vscodeContext: VSCodeContext
  ): WindsurfState {
    let state = this.activeConversations.get(chatId);
    if (state) {
      state.userMessage = userMessage;
      state.objective = `Responder a: ${userMessage.substring(0, 100)}...`;
      state.iterationCount = 0;
      state.completionStatus = 'in_progress';
      state.reasoningResult = undefined;
      state.actionResult = undefined;
      state.reflectionResult = undefined;
      state.correctionResult = undefined;
      state.history.push({
          // Asegúrate que 'user_input' o un tipo similar esté en la definición de HistoryEntry['phase']
          phase: 'user_input', // O 'user_message' si lo tienes definido
          timestamp: Date.now(),
        
          metadata: { userMessage, contextData, /* otros metadatos si los tienes */ },
          iteration: 0, // O un contador de mensajes
        
          id: `msg_${Date.now()}`, // Ejemplo de ID
          content: userMessage,
          sender: 'user',
      } as HistoryEntry); // Cast explícito si es necesario
      state.projectContext = contextData.projectContext || state.projectContext;
      state.editorContext = contextData.editorContext || state.editorContext;

      console.log(`[ConversationManager] Reusing state for chat ${chatId}`);
      return state;
    }

    const newState: WindsurfState = {
      objective: `Responder a: ${userMessage.substring(0, 100)}...`,
      userMessage: userMessage,
      chatId: chatId,
      iterationCount: 0,
      maxIterations: config.backend.react.maxIterations,
      completionStatus: 'in_progress',
      history: [{
          phase: 'user_input',
          timestamp: Date.now(),
        
          metadata: { userMessage, contextData },
          iteration: 0,
          id: `msg_init_${Date.now()}`, // Ejemplo de ID
          content: userMessage,
          sender: 'user',
      } as HistoryEntry], 
      projectContext: contextData.projectContext,
      editorContext: contextData.editorContext,
      metrics: {},
      timestamp: Date.now(),
    };
    this.activeConversations.set(chatId, newState);
    console.log(`[ConversationManager] Created new state for chat ${chatId}`);
    return newState;
  }

 
  public getConversationState(chatId:string): WindsurfState | undefined {
    return this.activeConversations.get(chatId);
  }

  public updateConversationState(chatId: string, state: WindsurfState): void {
    this.activeConversations.set(chatId, state);
    console.log(`[ConversationManager] Updated state for chat ${chatId}`);
  }

  public async endConversation(chatId: string, memoryManager?: MemoryManager): Promise<void> {
    const state = this.activeConversations.get(chatId);
    if (state && memoryManager) {
      console.log(`[ConversationManager] Conversation ${chatId} ended. State ready for LTM.`);
    }
  }

  public clearConversation(chatId: string, memoryManager: MemoryManager): void {
    this.activeConversations.delete(chatId);
    memoryManager.clearConversationMemory(chatId);
    console.log(`[ConversationManager] Cleared active conversation state for chat ${chatId}`);
  }
}