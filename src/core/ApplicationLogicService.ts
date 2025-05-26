// src/core/ApplicationLogicService.ts
import { VSCodeContext, WindsurfState, ChatMessage } from '../shared/types'; // Asumiendo que WindsurfState y otros tipos relevantes están aquí
import { MemoryManager } from '../features/memory/MemoryManager';
import { WindsurfGraph } from '../features/ai/ReActGraph'; // O como se llame tu clase de grafo ReAct
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { ConversationManager } from './ConversationManager';
// No importamos InternalEventDispatcher aquí, ya que este servicio no debe emitir eventos directamente.

/**
 * Define la estructura del resultado esperado al procesar un mensaje.
 * Esto permite al llamador (ej. WebviewProvider a través de IncomingMessageValidator)
 * saber qué sucedió y, si es necesario, disparar un evento a través del InternalEventDispatcher.
 */
export interface ProcessUserMessageResult {
  success: boolean;
  finalResponse?: string; // La respuesta final para el usuario, si la hubo
  updatedState?: WindsurfState; // El estado actualizado de la conversación
  error?: string; // Mensaje de error si success es false
}

export class ApplicationLogicService {
  constructor(
    private vscodeContext: VSCodeContext,
    private memoryManager: MemoryManager,
    private reactGraph: WindsurfGraph,
    private conversationManager: ConversationManager,
    private toolRegistry: ToolRegistry
  ) {
    console.log('[ApplicationLogicService] Initialized.');
    // Aquí no se instancia ni se usa directamente el InternalEventDispatcher.
    // Las acciones de este servicio pueden *resultar* en eventos,
    // pero serán emitidos por componentes más profundos (ej. ReActGraph, herramientas)
    // o por el orquestador que llama a este servicio basado en el resultado.
  }

  public async processUserMessage(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any> = {}
  ): Promise<ProcessUserMessageResult> {
    console.log(`[ApplicationLogicService:${chatId}] Processing message: "${userMessage.substring(0, 50)}..."`);

    const state = this.conversationManager.getOrCreateConversationState(
      chatId,
      userMessage,
      contextData,
      this.vscodeContext
    );

   
    try {
      if (!state.projectContext && this.toolRegistry) {
        const projectInfoTool = this.toolRegistry.getTool('getProjectInfo');
        if (projectInfoTool) {
          const projectInfoResult = await projectInfoTool.execute({});
          if (projectInfoResult.success) {
            state.projectContext = projectInfoResult.data;
            this.conversationManager.updateConversationState(chatId, state);
          }
        }
      }
    } catch (error) {
      console.warn(`[ApplicationLogicService:${chatId}] Error getting project info:`, error);
      // Aquí es donde un componente más profundo o el orquestador podría emitir un evento de error.
    }

    try {
      const resultState = await this.reactGraph.run(state);
      this.conversationManager.updateConversationState(chatId, resultState);

      let finalResponseText = 'No se pudo generar una respuesta.';

      if (resultState.completionStatus === 'completed' && resultState.actionResult?.result?.message) {
        finalResponseText = resultState.actionResult.result.message;
      } else if (resultState.error) {
        finalResponseText = `Error procesando tu solicitud: ${resultState.error}`;
      } else if (resultState.completionStatus === 'failed') {
        const lastPhase = resultState.history.length > 0 ? resultState.history.slice(-1)[0]?.phase : 'desconocido';
        finalResponseText = `La tarea no pudo completarse. Último estado: ${lastPhase}.`;
      }

      await this.memoryManager.storeConversation(chatId, resultState);
      this.conversationManager.endConversation(chatId); // No necesita memoryManager aquí si solo actualiza estado en memoria

      return {
        success: resultState.completionStatus === 'completed',
        finalResponse: finalResponseText,
        updatedState: resultState,
      };

    } catch (error: any) {
      console.error(`[ApplicationLogicService:${chatId}] Critical error processing message:`, error);
      const currentState = this.conversationManager.getConversationState(chatId);
      if (currentState) {
        currentState.completionStatus = 'failed';
        currentState.error = error.message;
        this.conversationManager.updateConversationState(chatId, currentState);
        await this.memoryManager.storeConversation(chatId, currentState); // Guardar estado fallido
      }
      return {
        success: false,
        error: error.message || 'Unknown critical error',
        updatedState: currentState,
      };
    }
  }

  public async clearConversation(chatId: string): Promise<void> {
    console.log(`[ApplicationLogicService] Clearing conversation: ${chatId}`);
    this.conversationManager.clearConversation(chatId, this.memoryManager);
    // La notificación de que la conversación fue limpiada (evento CONVERSATION_CLEARED)
    // debería ser emitida por el orquestador que llama a este método,
    // o por un EventSubscriptionManager que reacciona a la acción.
  }

  public async executeTool(toolName: string, params: any) {
    if (!this.toolRegistry) {
      throw new Error('ToolRegistry not available');
    }
    const tool = this.toolRegistry.getTool(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    return await tool.execute(params);
  }

  public dispose(): void {
    // Lógica para liberar recursos si es necesario (ej. listeners, timers)
    // Los managers (memoryManager, etc.) deberían tener sus propios métodos dispose
    // que serían llamados por ComponentFactory o el ciclo de vida de la extensión.
    if (this.memoryManager && typeof (this.memoryManager as any).dispose === 'function') {
        (this.memoryManager as any).dispose();
    }
    // ... otros managers
    console.log('[ApplicationLogicService] Disposed.');
  }
}