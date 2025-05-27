// src/core/ConversationManager.ts
import { WindsurfState, VSCodeContext, HistoryEntry } from '../shared/types';
import { MemoryManager } from '../features/memory/MemoryManager';
import { getConfig } from '../shared/config';
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
    vscodeContext: VSCodeContext // vscodeContext no se usa actualmente aquí, pero podría serlo en el futuro
  ): WindsurfState {
    let state = this.activeConversations.get(chatId);
    const currentTime = Date.now();

    if (state) {
      // Reutilizar y actualizar estado existente
      state.userMessage = userMessage;
      state.objective = `Responder a: ${userMessage.substring(0, 100)}...`;
      state.iterationCount = 0; // Reiniciar contador de iteraciones del agente para el nuevo mensaje
      state.completionStatus = 'in_progress';
      state.error = undefined; // Limpiar errores previos
      state.reasoningResult = undefined;
      state.actionResult = undefined;
      state.reflectionResult = undefined;
      state.correctionResult = undefined;
      state.finalOutput = undefined; // Limpiar salida final previa
      state.timestamp = currentTime; // Actualizar timestamp de la última actividad

      const userHistoryEntry: HistoryEntry = {
          phase: 'user_input',
          content: userMessage, // 'content' es heredado
          timestamp: currentTime,
          iteration: 0, // Corresponde al iterationCount reiniciado para este nuevo mensaje
          metadata: {
            // 'status' para 'user_input' podría ser 'success' (recibido) o no aplicar.
            // Lo dejaremos como 'success' para indicar que la entrada fue procesada.
            status: 'success',
            // Podríamos añadir el raw userMessage aquí si 'content' se transforma
            // rawUserMessage: userMessage,
            // files: contextData.files, // Si los archivos son parte de la entrada del usuario
          },
      };
      state.history.push(userHistoryEntry);

      // Actualizar contextos si se proporcionan nuevos
      if (contextData.projectContext) state.projectContext = contextData.projectContext;
      if (contextData.editorContext) state.editorContext = contextData.editorContext;

      console.log(`[ConversationManager] Reusing and updating state for chat ${chatId}`);
      this.activeConversations.set(chatId, state); // Asegurarse de que el mapa se actualice con la referencia modificada
      return state;
    }

    // Crear nuevo estado
    const initialUserEntry: HistoryEntry = {
        phase: 'user_input',
        content: userMessage,
        timestamp: currentTime,
        iteration: 0,
        metadata: {
          status: 'success',
          // files: contextData.files,
        },
    };

    const newState: WindsurfState = {
      objective: `Responder a: ${userMessage.substring(0, 100)}...`,
      userMessage: userMessage,
      chatId: chatId,
      iterationCount: 0,
      maxIterations: config.backend.react.maxIterations,
      completionStatus: 'in_progress',
      history: [initialUserEntry],
      projectContext: contextData.projectContext, // Puede ser undefined si no se provee
      editorContext: contextData.editorContext, // Puede ser undefined si no se provee
      metrics: {}, // Inicializar vacío
      timestamp: currentTime,
    };
    this.activeConversations.set(chatId, newState);
    console.log(`[ConversationManager] Created new state for chat ${chatId}`);
    return newState;
  }

  public getConversationState(chatId:string): WindsurfState | undefined {
    return this.activeConversations.get(chatId);
  }

  public updateConversationState(chatId: string, state: WindsurfState): void {
    // Asegurarse de que el timestamp se actualice en cada update
    state.timestamp = Date.now();
    this.activeConversations.set(chatId, state);
    // console.log(`[ConversationManager] Updated state for chat ${chatId}`); // Puede ser muy verboso
  }

  public async endConversation(chatId: string, memoryManager?: MemoryManager): Promise<void> {
    const state = this.activeConversations.get(chatId);
    if (state) {
      // La lógica de persistencia (storeConversation) se maneja en ApplicationLogicService
      // después de que el ciclo ReAct completa o falla.
      // Aquí, 'endConversation' podría significar que ya no se espera más procesamiento activo
      // para el *último mensaje del usuario* en esta conversación.
      // No necesariamente se elimina del mapa de 'activeConversations' porque el usuario
      // podría enviar otro mensaje en el mismo chat.
      console.log(`[ConversationManager] Conversation processing for last message in chat ${chatId} ended. Current status: ${state.completionStatus}.`);
    }
  }

  public clearConversation(chatId: string, memoryManager?: MemoryManager): void {
    this.activeConversations.delete(chatId);
    if (memoryManager) {
      memoryManager.clearConversationMemory(chatId); // Asumiendo que esto limpia STM y MTM
    }
    console.log(`[ConversationManager] Cleared active conversation state and memory for chat ${chatId}`);
  }
}