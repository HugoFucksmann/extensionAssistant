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
      // 2. Invocar el motor LangGraph. No esperamos el resultado aquí.
      // La UI se actualizará a través de eventos.
      const resultGraphState = await this.agentEngine.run(userMessage, chatId);

      // 3. El procesamiento de la respuesta final es responsabilidad de los eventos generados por el grafo.
      // Solo se actualiza el estado interno para consistencia.
      convState.error = resultGraphState.error;
      this.conversationManager.updateConversationState(chatId, convState);

      // Retornamos solo el éxito o error; la UI debe escuchar los eventos para la respuesta.
      return {
        success: !resultGraphState.error,
        updatedState: convState,
        error: resultGraphState.error,
      };


    } catch (error: any) {
      const finalErrorState = this.conversationManager.getConversationState(chatId) || convState;
      finalErrorState.error = error.message || 'Unknown critical error in ApplicationLogicService.';
this.conversationManager.updateConversationState(chatId, finalErrorState);

      // Devolver el error para que el llamador sepa que el proceso falló.
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