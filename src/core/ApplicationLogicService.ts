// src/core/ApplicationLogicService.ts
import { SimplifiedOptimizedGraphState } from './langgraph/state/GraphState';
import { ConversationManager } from './ConversationManager';
import { Disposable } from './interfaces/Disposable';
import { LangGraphEngine } from './langgraph/LangGraphEngine';
import { ToolRegistry } from '../features/tools/ToolRegistry';
// CAMBIO: Importaciones necesarias
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { EventType } from '../features/events/eventTypes';
import { AIMessage } from '@langchain/core/messages';

export interface ProcessUserMessageResult {
  success: boolean;
  finalResponse?: string; // Mantenemos string para la API externa, pero internamente manejaremos el tipo correcto
  updatedState?: SimplifiedOptimizedGraphState;
  error?: string;
}

export class ApplicationLogicService implements Disposable {
  // CAMBIO: Añadir el dispatcher al constructor
  constructor(
    private agentEngine: LangGraphEngine,
    private conversationManager: ConversationManager,
    private toolRegistry: ToolRegistry,
    private dispatcher: InternalEventDispatcher // Añadido
  ) { }

  public async processUserMessage(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any> = {}
  ): Promise<ProcessUserMessageResult> {
    const { state: convState, isNew } = this.conversationManager.getOrCreateConversationState(
      chatId,
      userMessage,
      contextData
    );
    if (isNew) {
      this.conversationManager.setActiveChatId(chatId);
    }

    // CAMBIO: Eliminamos el `try...catch` que envolvía la llamada al motor.
    // El motor ahora se ejecuta en segundo plano y el `catch` aquí no capturaría errores asíncronos.
    // La función principal ahora solo inicia el proceso.

    // Ejecutamos el motor en segundo plano y no esperamos (fire-and-forget).
    // El motor es responsable de emitir eventos, incluyendo el de finalización o error.
    this.agentEngine.run(userMessage, chatId)
      .catch((error: any) => {
        // Este catch es un último recurso si la promesa de `run` es rechazada,
        // lo cual no debería ocurrir si el motor maneja sus propios errores internos.
        console.error(`[ApplicationLogicService] Critical unhandled error from agentEngine.run for chat ${chatId}:`, error);

        // Despachamos un evento de error del sistema para que la UI reaccione.
        this.dispatcher.dispatch(EventType.SYSTEM_ERROR, {
          chatId: chatId,
          message: `Error crítico en el motor del agente: ${error.message}`,
          source: 'ApplicationLogicService.processUserMessage.catch',
          errorObject: error,
        });

        // Actualizamos el estado de la conversación con el error.
        const finalErrorState = this.conversationManager.getConversationState(chatId) || convState;
        finalErrorState.error = error.message || 'Unknown async error in LangGraphEngine.';
        this.conversationManager.updateConversationState(chatId, finalErrorState);
      });

    // Retornamos inmediatamente para que la UI no se quede bloqueada.
    // La UI ahora dependerá 100% de los eventos para las actualizaciones.
    return {
      success: true,
      updatedState: convState
    };
  }

  public async clearConversation(chatId?: string): Promise<boolean> {
    return this.conversationManager.clearConversation(chatId);
  }

  public dispose(): void {
    console.log('[ApplicationLogicService] Disposed.');
  }
}