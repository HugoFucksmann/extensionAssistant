// src/core/ApplicationLogicService.ts
import { WindsurfState } from './types';
import { MemoryManager } from '../features/memory/MemoryManager';
// import { OptimizedReActEngine } from '../features/ai/core/OptimizedReActEngine'; // Ya no se importa directamente
import { ModelManager } from '../features/ai/ModelManager'; // No se usa directamente aquí, pero se mantiene por si acaso
import { InternalEventDispatcher } from './events/InternalEventDispatcher'; // No se usa directamente aquí
import { getConfig } from '../shared/config';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { ConversationManager } from './ConversationManager';
import { ToolResult } from '../features/tools/types';
import { addErrorToHistory } from './utils/historyUtils';
import { Disposable } from './interfaces/Disposable';

// NUEVA IMPORTACIÓN
import { LangGraphAdapter } from './langgraph/LangGraphAdapter';

// El tipo para el motor de ejecución ahora es el adaptador
type AgentExecutionEngineType = LangGraphAdapter;

export interface ProcessUserMessageResult {
  success: boolean;
  finalResponse?: string;
  updatedState?: WindsurfState;
  error?: string;
}

export class ApplicationLogicService implements Disposable {
  constructor(
    private memoryManager: MemoryManager,
    private agentEngine: AgentExecutionEngineType, // Cambiado a AgentExecutionEngineType
    private conversationManager: ConversationManager,
    private toolRegistry: ToolRegistry
  ) {

  }

  public async processUserMessage(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any> = {}
  ): Promise<ProcessUserMessageResult> {
    const { state, isNew } = this.conversationManager.getOrCreateConversationState(
      chatId || undefined,
      userMessage,
      contextData
    );

    if (isNew) {
      this.conversationManager.setActiveChatId(chatId);
    }

    try {
      // Llama al método run del adaptador
      const resultState = await this.agentEngine.run(state);
      this.conversationManager.updateConversationState(chatId, resultState);
      // El almacenamiento de la conversación ahora podría ser manejado dentro del motor
      // o seguir aquí. Si LangGraphEngine lo hace, se puede quitar de aquí.
      // Por ahora, lo dejamos para consistencia.
      await this.memoryManager.storeConversation(chatId, resultState);

      return {
        success: resultState.completionStatus === 'completed',
        finalResponse: resultState.finalOutput,
        updatedState: resultState,
        error: resultState.completionStatus !== 'completed'
          ? (resultState.error || 'Processing did not complete successfully.')
          : undefined,
      };
    } catch (error: any) {
      const currentState = this.conversationManager.getConversationState(chatId);
      const finalErrorState = currentState || state;

      finalErrorState.completionStatus = 'failed';
      finalErrorState.error = error.message || 'Unknown critical error during message processing.';
      this.addErrorToHistory(finalErrorState, error.message); // Usa la función helper

      this.conversationManager.updateConversationState(chatId, finalErrorState);
      await this.memoryManager.storeConversation(chatId, finalErrorState);

      return {
        success: false,
        error: finalErrorState.error,
        updatedState: finalErrorState,
      };
    }
  }

  private addErrorToHistory(state: WindsurfState, errorMessage: string): void {
    addErrorToHistory(state, `Critical error in ApplicationLogicService: ${errorMessage}`);
  }

  public async clearConversation(chatId?: string): Promise<boolean> {
    return this.conversationManager.clearConversation(chatId, this.memoryManager);
  }

  public async invokeTool(
    toolName: string,
    params: any,
    executionContextArgs: { chatId?: string;[key: string]: any } = {}
  ): Promise<ToolResult> {
    return this.toolRegistry.executeTool(toolName, params, executionContextArgs);
  }

  public dispose(): void {
    // El motor principal (LangGraphAdapter) se dispone a través de ComponentFactory.
    // memoryManager también se dispone centralmente.
    // No hay nada específico que ApplicationLogicService necesite disponer por sí mismo
    // si sus dependencias se gestionan externamente.
    console.log('[ApplicationLogicService] Disposed.');
  }
}