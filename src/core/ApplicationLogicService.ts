// src/core/ApplicationLogicService.ts
import { SimplifiedOptimizedGraphState } from './langgraph/state/GraphState';
import { ConversationManager } from './ConversationManager';
import { ToolResult } from '../features/tools/types';
import { Disposable } from './interfaces/Disposable';
import { LangGraphEngine } from './langgraph/LangGraphEngine';
import { ToolRegistry } from '../features/tools/ToolRegistry';

export interface ProcessUserMessageResult {
  success: boolean;
  finalResponse?: string;
  updatedState?: SimplifiedOptimizedGraphState;
  error?: string;
}

export class ApplicationLogicService implements Disposable {
  constructor(
    private agentEngine: LangGraphEngine,
    private conversationManager: ConversationManager,
    private toolRegistry: ToolRegistry
  ) { }

  /**
   * Procesa el mensaje del usuario iniciando el flujo LangGraph de manera asíncrona (fire-and-forget).
   * No espera el resultado del grafo ni retorna la respuesta generada por la IA.
   * La UI debe actualizarse exclusivamente a través de los eventos emitidos por el backend (por ejemplo, RESPONSE_GENERATED).
   */
  public async processUserMessage(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any> = {}
  ): Promise<ProcessUserMessageResult> {
    // 1. Obtener o crear el estado de la conversación para registrar el mensaje del usuario
    const { state: convState, isNew } = this.conversationManager.getOrCreateConversationState(
      chatId,
      userMessage,
      contextData
    );
    if (isNew) {
      this.conversationManager.setActiveChatId(chatId);
    }

    try {
      // 2. Invocar el motor LangGraph de manera asíncrona (fire-and-forget).
      // No esperamos el resultado aquí. La UI se actualizará a través de eventos.
      this.agentEngine.run(userMessage, chatId)
        .catch((error: any) => {
          // Manejo de errores asíncronos: actualizar el estado de la conversación y emitir eventos si corresponde.
          convState.error = error.message || 'Unknown async error in LangGraphEngine.';
          this.conversationManager.updateConversationState(chatId, convState);
          // Aquí podría emitirse un evento de error global si el sistema lo requiere.
        });

      // 3. Retornamos solo la aceptación/inicio del procesamiento; la UI debe escuchar los eventos para la respuesta.
      return {
        success: true,
        updatedState: convState
      };
    } catch (error: any) {
      const finalErrorState = this.conversationManager.getConversationState(chatId) || convState;
      finalErrorState.error = error.message || 'Unknown critical error in ApplicationLogicService.';
      this.conversationManager.updateConversationState(chatId, finalErrorState);
      return {
        success: false,
        error: finalErrorState.error,
        updatedState: finalErrorState,
      };
    }
  }

  public async clearConversation(chatId?: string): Promise<boolean> {
    return this.conversationManager.clearConversation(chatId);
  }


  public dispose(): void {
    console.log('[ApplicationLogicService] Disposed.');
  }
}