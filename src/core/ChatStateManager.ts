// src/core/ChatStateManager.ts
// (Antes: src/core/ConversationManager.ts)

import { WindsurfState, VSCodeContext, HistoryEntry } from '../shared/types'; // Importa HistoryEntry
import { WindsurfConfig } from '../shared/config';
import { ChatMemoryManager } from '@features/memory/ChatMemoryManager';

export class ChatStateManager { // RENOMBRAR CLASE
  private activeConversations: Map<string, WindsurfState> = new Map();

  constructor() {
    console.log('[ChatStateManager] Initialized'); // ACTUALIZAR LOG
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
          // Mueve userMessage y contextData a metadata
          metadata: { userMessage, contextData, /* otros metadatos si los tienes */ },
          iteration: 0, // O un contador de mensajes
          // Las propiedades 'id', 'content', 'sender' vienen de ChatMessage (Omit)
          // Necesitas proveerlas si no son opcionales o si HistoryEntry las requiere.
          // HistoryEntry hereda de Omit<ChatMessage, 'metadata'>.
          // ChatMessage tiene: id, content, sender, timestamp.
          // 'content' podría ser userMessage, 'sender' podría ser 'user'.
          // 'id' necesitaría ser generado.
          id: `msg_${Date.now()}`, // Ejemplo de ID
          content: userMessage,
          sender: 'user',
      } as HistoryEntry); // Cast explícito si es necesario
      state.projectContext = contextData.projectContext || state.projectContext;
      state.editorContext = contextData.editorContext || state.editorContext;

      console.log(`[ChatStateManager] Reusing state for chat ${chatId}`); // ACTUALIZAR LOG
      return state;
    }

    const newState: WindsurfState = {
      objective: `Responder a: ${userMessage.substring(0, 100)}...`,
      userMessage: userMessage,
      chatId: chatId,
      iterationCount: 0,
      maxIterations: WindsurfConfig.react.maxIterations,
      completionStatus: 'in_progress',
      history: [{
          phase: 'user_input', // O 'user_message'
          timestamp: Date.now(),
          // Mueve userMessage y contextData a metadata
          metadata: { userMessage, contextData },
          iteration: 0,
          id: `msg_init_${Date.now()}`, // Ejemplo de ID
          content: userMessage,
          sender: 'user',
      } as HistoryEntry], // Cast explícito si es necesario
      projectContext: contextData.projectContext,
      editorContext: contextData.editorContext,
      metrics: {},
      timestamp: Date.now(),
    };
    this.activeConversations.set(chatId, newState);
    console.log(`[ChatStateManager] Created new state for chat ${chatId}`); // ACTUALIZAR LOG
    return newState;
  }

  // ... resto de la clase
  public getConversationState(chatId:string): WindsurfState | undefined {
    return this.activeConversations.get(chatId);
  }

  public updateConversationState(chatId: string, state: WindsurfState): void {
    this.activeConversations.set(chatId, state);
    console.log(`[ChatStateManager] Updated state for chat ${chatId}`); // ACTUALIZAR LOG
  }

  public async endConversation(chatId: string, memoryManager?: ChatMemoryManager): Promise<void> {
    const state = this.activeConversations.get(chatId);
    if (state && memoryManager) {
      console.log(`[ChatStateManager] Conversation ${chatId} ended. State ready for LTM.`); // ACTUALIZAR LOG
    }
  }

  public clearConversation(chatId: string, memoryManager: ChatMemoryManager): void {
    this.activeConversations.delete(chatId);
    memoryManager.clearConversationMemory(chatId);
    console.log(`[ChatStateManager] Cleared active conversation state for chat ${chatId}`); // ACTUALIZAR LOG
  }
}