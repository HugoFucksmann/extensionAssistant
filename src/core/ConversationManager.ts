// src/core/ConversationManager.ts
import { WindsurfState, VSCodeContext, HistoryEntry, ChatMessage } from '../shared/types'; // Asegúrate que ChatMessage esté aquí si es necesario para el cast, aunque idealmente no
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
      state.iterationCount = 0; // Reiniciar para un nuevo mensaje en una conversación existente
      state.completionStatus = 'in_progress';
      state.reasoningResult = undefined;
      state.actionResult = undefined;
      state.reflectionResult = undefined;
      state.correctionResult = undefined;
      // No limpiar todo el historial, solo añadir la nueva entrada de usuario
      // state.history = []; // Esto borraría el historial previo de la conversación

      const userHistoryEntry: HistoryEntry = {
          phase: 'user_input',
          timestamp: Date.now(),
          metadata: { userMessage, contextData, status: 'info' }, // Añadido status
          iteration: state.history.length, // Iteración basada en el número de entradas
          id: `msg_${chatId}_${Date.now()}`,
          content: userMessage,
          sender: 'user',
      };
      state.history.push(userHistoryEntry);
      state.projectContext = contextData.projectContext || state.projectContext;
      state.editorContext = contextData.editorContext || state.editorContext;

      console.log(`[ConversationManager] Reusing and updating state for chat ${chatId}`);
      return state;
    }

    const initialUserEntry: HistoryEntry = {
        phase: 'user_input',
        timestamp: Date.now(),
        metadata: { userMessage, contextData, status: 'info' }, // Añadido status
        iteration: 0,
        id: `msg_init_${chatId}_${Date.now()}`,
        content: userMessage,
        sender: 'user',
    };

    const newState: WindsurfState = {
      objective: `Responder a: ${userMessage.substring(0, 100)}...`,
      userMessage: userMessage,
      chatId: chatId,
      iterationCount: 0,
      maxIterations: config.backend.react.maxIterations,
      completionStatus: 'in_progress',
      history: [initialUserEntry],
      projectContext: contextData.projectContext,
      editorContext: contextData.editorContext,
      metrics: {},
      timestamp: Date.now(),
    };
    this.activeConversations.set(chatId, newState);
    console.log(`[ConversationManager] Created new state for chat ${chatId}`);
    return newState;
  }

  // ... (resto de la clase sin cambios)
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
      // La lógica de guardado ya está en processUserMessage, aquí solo marcamos como finalizada en memoria si es necesario
      // await memoryManager.storeConversation(chatId, state);
      console.log(`[ConversationManager] Conversation ${chatId} ended. State ready for LTM.`);
    }
    // Opcionalmente, podrías removerla de activeConversations aquí si ya no se va a reutilizar
    // this.activeConversations.delete(chatId);
  }

  public clearConversation(chatId: string, memoryManager: MemoryManager): void {
    this.activeConversations.delete(chatId);
    memoryManager.clearConversationMemory(chatId); // Asumiendo que esto limpia STM y MTM
    // Considera si también quieres limpiar LTM para este chatId o si es una acción separada
    console.log(`[ConversationManager] Cleared active conversation state for chat ${chatId}`);
  }
}