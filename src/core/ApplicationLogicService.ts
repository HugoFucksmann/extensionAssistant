// src/core/ApplicationLogicService.ts
import { VSCodeContext, WindsurfState } from '../shared/types';
import { MemoryManager } from '../features/memory/MemoryManager';
import { OptimizedReActEngine } from './OptimizedReActEngine';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { ConversationManager } from './ConversationManager';
import { ToolResult } from '../features/tools/types';

// Tipo unión para aceptar cualquiera de los dos motores ReAct
type ReActEngineType =  OptimizedReActEngine;

export interface ProcessUserMessageResult {
  success: boolean;
  finalResponse?: string;
  updatedState?: WindsurfState;
  error?: string;
}

export class ApplicationLogicService {
  constructor(
    private memoryManager: MemoryManager,
    private reActEngine: ReActEngineType, 
    private conversationManager: ConversationManager,
    private toolRegistry: ToolRegistry
  ) {
    
    console.log('[ApplicationLogicService] Initialized.');
  }

  public async processUserMessage(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any> = {} 
  ): Promise<ProcessUserMessageResult> {
    const startTime = Date.now();
    console.log(`[ApplicationLogicService:${chatId}] Processing message: "${userMessage.substring(0, 50)}..."`);

   

    const state = this.conversationManager.getOrCreateConversationState(
      chatId,
      userMessage,
      contextData, 
   
    );
    
    try {
      if (!state.projectContext && this.toolRegistry) {
        const projectInfoToolName = 'getProjectSummary'; 
      
        if (this.toolRegistry.getTool(projectInfoToolName)) {
            const projectInfoResult = await this.toolRegistry.executeTool(
                projectInfoToolName,
                {}, 
                { chatId } 
            );
            
            if (projectInfoResult.success && projectInfoResult.data) {
              state.projectContext = projectInfoResult.data as any;
             
              console.log(`[ApplicationLogicService:${chatId}] Project context obtained successfully.`);
            } else if (!projectInfoResult.success) {
              console.warn(`[ApplicationLogicService:${chatId}] Failed to get project info via ToolRegistry for chat ${chatId}: ${projectInfoResult.error}`);
            }
        } else {
            console.warn(`[ApplicationLogicService:${chatId}] Tool '${projectInfoToolName}' not found in registry.`);
        }
      }
    } catch (error) {
      console.warn(`[ApplicationLogicService:${chatId}] Error during initial project info retrieval for chat ${chatId}:`, error);
    }

    try {
  
      const resultState = await this.reActEngine.run(state);


      this.conversationManager.updateConversationState(chatId, resultState);

      let finalResponseText = 'No specific response was generated.'; 


      if (resultState.completionStatus === 'completed') {
          if (resultState.finalOutput) {
              finalResponseText = typeof resultState.finalOutput === 'string' 
                  ? resultState.finalOutput 
                  : JSON.stringify(resultState.finalOutput);
          } else {
             
              const lastMeaningfulEntry = resultState.history?.slice().reverse().find(
                  h => (h.phase === 'responseGeneration' && h.content) || 
                       (h.phase === 'action' && h.metadata?.toolName && ['sendResponseToUser', 'respond'].includes(h.metadata.toolName) && h.content)
              );
              if (lastMeaningfulEntry?.content) {
                  try {
                  
                      const contentObj = JSON.parse(lastMeaningfulEntry.content);
                      finalResponseText = contentObj.message || contentObj.response || lastMeaningfulEntry.content;
                  } catch (e) {
                      finalResponseText = lastMeaningfulEntry.content;
                  }
              } else {
                  console.warn(`[ApplicationLogicService:${chatId}] Completed state but no finalOutput or suitable history entry found.`);
                  finalResponseText = "The process completed, but I don't have a specific message to show.";
              }
          }
      } else if (resultState.error) {
        finalResponseText = `I encountered an error: ${resultState.error}`;
      } else if (resultState.completionStatus === 'failed') {
        const lastPhase = resultState.history?.length > 0 ? resultState.history.slice(-1)[0]?.phase : 'unknown';
        finalResponseText = `The task could not be completed. Last phase: ${lastPhase}. ${resultState.error ? `Error: ${resultState.error}` : ''}`;
      } else {

        console.warn(`[ApplicationLogicService:${chatId}] Unexpected completion status: ${resultState.completionStatus}`);
        finalResponseText = `The process finished with an unexpected status: ${resultState.completionStatus}.`;
      }

      await this.memoryManager.storeConversation(chatId, resultState);

      const duration = Date.now() - startTime;
      console.log(`[ApplicationLogicService:${chatId}] Message processing finished. Success: ${resultState.completionStatus === 'completed'}. Duration: ${duration}ms.`);

      return {
        success: resultState.completionStatus === 'completed', 
        finalResponse: finalResponseText,
        updatedState: resultState,
        error: resultState.completionStatus !== 'completed' ? (resultState.error || 'Processing did not complete successfully.') : undefined,
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[ApplicationLogicService:${chatId}] CRITICAL error processing message (duration: ${duration}ms):`, error);
      const currentState = this.conversationManager.getConversationState(chatId);
      let finalErrorState = currentState || state; 

      finalErrorState.completionStatus = 'failed'; 
      finalErrorState.error = error.message || 'Unknown critical error during message processing.';
      this.addErrorToHistory(finalErrorState, error.message);
      
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
    if (!state.history) {
        state.history = [];
    }
    state.history.push({
        phase: 'system_message', 
        content: `Critical error in ApplicationLogicService: ${errorMessage}`,
        timestamp: Date.now(),
        iteration: state.iterationCount || 0, 
        metadata: { status: 'error' }
    });
  }

  public async clearConversation(chatId: string): Promise<void> {
    console.log(`[ApplicationLogicService] Clearing conversation: ${chatId}`);
   
    this.conversationManager.clearConversation(chatId, this.memoryManager);
  }

  public async invokeTool(
    toolName: string,
    params: any,
    executionContextArgs: { chatId?: string; uiOperationId?: string; [key: string]: any } = {}
  ): Promise<ToolResult> {
    if (!this.toolRegistry) {
      console.error('[ApplicationLogicService] ToolRegistry not available to invokeTool.');
      return { success: false, error: 'ToolRegistry not available', executionTime: 0 };
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