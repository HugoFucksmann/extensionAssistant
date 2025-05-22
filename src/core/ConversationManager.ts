// src/core/ConversationManager.ts
import { WindsurfState, VSCodeContext } from '../shared/types';
import { MemoryManager } from '../features/memory/MemoryManager';
import { WindsurfConfig } from '../shared/config';
import { IConversationManager } from './interfaces/IConversationManager';

export class ConversationManager implements IConversationManager {
  private activeConversations: Map<string, WindsurfState> = new Map();
  // Inyecta MemoryManager si ConversationManager es responsable de la persistencia final
  // private memoryManager: MemoryManager;

  constructor(/* memoryManager?: MemoryManager */) {
    // this.memoryManager = memoryManager;
    console.log('[ConversationManager] Initialized');
  }

  public getOrCreateConversationState(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any> = {},
    vscodeContext: VSCodeContext // Para inicializar el estado si es necesario
  ): WindsurfState {
    let state = this.activeConversations.get(chatId);
    if (state) {
      // Actualizar estado para un nuevo mensaje dentro de la misma conversación
      state.userMessage = userMessage;
      state.objective = `Responder a: ${userMessage.substring(0, 100)}...`; // O una lógica más sofisticada
      state.iterationCount = 0;
      state.completionStatus = 'in_progress';
      state.reasoningResult = undefined;
      state.actionResult = undefined;
      state.reflectionResult = undefined;
      state.correctionResult = undefined;
      // Considera si el historial debe reiniciarse o acumularse
      // state.history = []; // Si cada mensaje inicia un "nuevo" ciclo ReAct
      state.history.push({ // Si se acumula, añade el mensaje del usuario
          phase: 'user_message' as any, // Necesitarás un tipo para esto en HistoryEntry
          timestamp: Date.now(),
          data: { userMessage, contextData },
          iteration: 0 // O un contador de mensajes
      });
      // Actualizar contextos
      state.projectContext = contextData.projectContext || state.projectContext;
      state.editorContext = contextData.editorContext || state.editorContext;

      console.log(`[ConversationManager] Reusing state for chat ${chatId}`);
      return state;
    }

    // Crear nuevo estado (basado en tu initializeWindsurfState)
    const newState: WindsurfState = {
      objective: `Responder a: ${userMessage.substring(0, 100)}...`,
      userMessage: userMessage,
      chatId: chatId,
      iterationCount: 0,
      maxIterations: WindsurfConfig.react.maxIterations,
      completionStatus: 'in_progress',
      history: [{
          phase: 'user_message' as any, // Necesitarás un tipo para esto en HistoryEntry
          timestamp: Date.now(),
          data: { userMessage, contextData },
          iteration: 0
      }],
      projectContext: contextData.projectContext,
      editorContext: contextData.editorContext,
      // Otros campos de WindsurfState con valores iniciales de tus mejoras de Fase 1
      metrics: {}, // Inicializar métricas
      // ...
      timestamp: Date.now(),
      // Asegúrate de que todos los campos de WindsurfState estén aquí
    };
    this.activeConversations.set(chatId, newState);
    console.log(`[ConversationManager] Created new state for chat ${chatId}`);
    return newState;
  }

  public getConversationState(chatId: string): WindsurfState | undefined {
    return this.activeConversations.get(chatId);
  }

  public updateConversationState(chatId: string, state: WindsurfState): void {
    this.activeConversations.set(chatId, state);
    console.log(`[ConversationManager] Updated state for chat ${chatId}`);
  }

  public async endConversation(chatId: string, memoryManager?: MemoryManager): Promise<void> {
    const state = this.activeConversations.get(chatId);
    if (state && memoryManager) {
      // El controlador principal podría ser responsable de esto
      // await memoryManager.storeConversation(chatId, state);
      console.log(`[ConversationManager] Conversation ${chatId} ended. State ready for LTM.`);
    }
    // No borra el estado aquí, el controlador puede querer acceder a él después de que el grafo termine.
    // this.activeConversations.delete(chatId);
  }

  public clearConversation(chatId: string, memoryManager: MemoryManager): void {
    this.activeConversations.delete(chatId);
    memoryManager.clearConversationMemory(chatId); // MemoryManager maneja STM/MTM
    // LTM se maneja por separado si es necesario
    console.log(`[ConversationManager] Cleared active conversation state for chat ${chatId}`);
  }
}