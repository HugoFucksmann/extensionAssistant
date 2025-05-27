// src/core/ApplicationLogicService.ts
import { VSCodeContext, WindsurfState } from '../shared/types';
import { MemoryManager } from '../features/memory/MemoryManager';
import { WindsurfGraph } from '../features/ai/ReActGraph';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { ConversationManager } from './ConversationManager';
import { ToolResult } from '../features/tools/types'; // <--- AÑADIR

export interface ProcessUserMessageResult {
  success: boolean;
  finalResponse?: string;
  updatedState?: WindsurfState;
  error?: string;
}

export class ApplicationLogicService {
  constructor(
    private vscodeContext: VSCodeContext,
    private memoryManager: MemoryManager,
    private reactGraph: WindsurfGraph,
    private conversationManager: ConversationManager,
    private toolRegistry: ToolRegistry // ToolRegistry debe tener el dispatcher inyectado
  ) {
    console.log('[ApplicationLogicService] Initialized.');
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
        const projectInfoToolName = 'getProjectSummary';
        const projectInfoResult = await this.toolRegistry.executeTool(
            projectInfoToolName,
            {},
            { chatId }
        );
        
        if (projectInfoResult.success && projectInfoResult.data) {
          state.projectContext = projectInfoResult.data as any;
          this.conversationManager.updateConversationState(chatId, state);
          console.log(`[ApplicationLogicService:${chatId}] Project context obtained successfully.`);
        } else if (!projectInfoResult.success) {
          console.warn(`[ApplicationLogicService:${chatId}] Failed to get project info via ToolRegistry: ${projectInfoResult.error}`);
        }
      }
    } catch (error) {
      console.warn(`[ApplicationLogicService:${chatId}] Error during initial project info retrieval:`, error);
    }

    // ... (resto del método processUserMessage igual)
    try {
      const resultState = await this.reactGraph.run(state);
      this.conversationManager.updateConversationState(chatId, resultState);

      let finalResponseText = 'No se pudo generar una respuesta.';

      if (resultState.completionStatus === 'completed') {
          const lastHistoryEntry = resultState.history?.slice().reverse().find(h => h.phase === 'responseGeneration' || (h.phase === 'action' && h.metadata?.toolName === 'sendResponseToUser'));
          if (lastHistoryEntry?.content) {
              finalResponseText = lastHistoryEntry.content;
          } else if (resultState.actionResult?.result?.message) {
              finalResponseText = resultState.actionResult.result.message;
          } else if (resultState.finalOutput) {
              finalResponseText = typeof resultState.finalOutput === 'string' ? resultState.finalOutput : JSON.stringify(resultState.finalOutput);
          }
      } else if (resultState.error) {
        finalResponseText = `Error procesando tu solicitud: ${resultState.error}`;
      } else if (resultState.completionStatus === 'failed') {
        const lastPhase = resultState.history?.length > 0 ? resultState.history.slice(-1)[0]?.phase : 'desconocido';
        finalResponseText = `La tarea no pudo completarse. Último estado: ${lastPhase}.`;
      }

      await this.memoryManager.storeConversation(chatId, resultState);
      this.conversationManager.endConversation(chatId); 

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
        await this.memoryManager.storeConversation(chatId, currentState);
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
  }

  /**
   * Executes a tool via the ToolRegistry.
   * This is intended for direct UI actions that need to run a tool
   * outside the main agent processing loop.
   * @param toolName The name of the tool to execute.
   * @param params The parameters for the tool.
   * @param executionContextArgs Optional arguments for the execution context, like chatId.
   * @returns A Promise resolving to the ToolResult.
   */
  public async invokeTool(
    toolName: string,
    params: any,
    executionContextArgs: { chatId?: string; uiOperationId?: string; [key: string]: any } = {}
  ): Promise<ToolResult> {
    if (!this.toolRegistry) {
      console.error('[ApplicationLogicService] ToolRegistry not available to invokeTool.');
      return { success: false, error: 'ToolRegistry not available' };
    }
    console.log(`[ApplicationLogicService] Invoking tool "${toolName}" directly with params:`, params, "ContextArgs:", executionContextArgs);
    return this.toolRegistry.executeTool(toolName, params, executionContextArgs);
  }

  public dispose(): void {
    if (this.memoryManager && typeof (this.memoryManager as any).dispose === 'function') {
        (this.memoryManager as any).dispose();
    }
    console.log('[ApplicationLogicService] Disposed.');
  }
}