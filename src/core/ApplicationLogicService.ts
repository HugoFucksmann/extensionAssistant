// src/core/ApplicationLogicService.ts
import { VSCodeContext, WindsurfState } from '../shared/types';
import { MemoryManager } from '../features/memory/MemoryManager';
// import { WindsurfGraph } from '../features/ai/ReActGraph'; // <-- REMOVE or COMMENT OUT
import { ReActEngine } from './ReActEngine';                   // <-- ADD
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { ConversationManager } from './ConversationManager';
import { ToolResult } from '../features/tools/types'; 

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
    private reActEngine: ReActEngine, // <-- CHANGED from reactGraph to reActEngine
    private conversationManager: ConversationManager,
    private toolRegistry: ToolRegistry
  ) {
    // The ReActEngine itself will log its initialization via dispatcher
    console.log('[ApplicationLogicService] Initialized.');
  }

  public async processUserMessage(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any> = {} // e.g., { uiOperationId?: string, projectContext?: any, editorContext?: any }
  ): Promise<ProcessUserMessageResult> {
    const startTime = Date.now();
    console.log(`[ApplicationLogicService:${chatId}] Processing message: "${userMessage.substring(0, 50)}..."`);

    // uiOperationId could be passed from WebviewProvider if needed for event correlation
    // const uiOperationId = contextData.uiOperationId; 

    const state = this.conversationManager.getOrCreateConversationState(
      chatId,
      userMessage,
      contextData, // Pass along contextData which might include project/editor context
      this.vscodeContext
    );
    // If uiOperationId is used, you might want to store it in the state:
    // if (uiOperationId) { (state as any).uiOperationId = uiOperationId; }


    // Initial project context retrieval (can remain as is)
    try {
      if (!state.projectContext && this.toolRegistry) {
        const projectInfoToolName = 'getProjectSummary'; // Or 'getProjectInfo'
        // Check if the tool actually exists to prevent errors
        if (this.toolRegistry.getTool(projectInfoToolName)) {
            const projectInfoResult = await this.toolRegistry.executeTool(
                projectInfoToolName,
                {}, // No params for getProjectSummary
                { chatId } // Context for the tool execution
            );
            
            if (projectInfoResult.success && projectInfoResult.data) {
              state.projectContext = projectInfoResult.data as any;
              // No need to updateConversationState here, it will be updated after ReActEngine.run()
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
      // --- CALL THE NEW ReActEngine ---
      const resultState = await this.reActEngine.run(state); // <-- CHANGED
      // ---                               ---

      this.conversationManager.updateConversationState(chatId, resultState);

      let finalResponseText = 'No specific response was generated.'; // Default if no other output found

      // Logic to extract finalResponseText from resultState (can largely remain as is)
      if (resultState.completionStatus === 'completed') {
          if (resultState.finalOutput) {
              finalResponseText = typeof resultState.finalOutput === 'string' 
                  ? resultState.finalOutput 
                  : JSON.stringify(resultState.finalOutput);
          } else {
              // Fallback if finalOutput is empty but status is completed (should be rare if ReActEngine ensures finalOutput)
              const lastMeaningfulEntry = resultState.history?.slice().reverse().find(
                  h => (h.phase === 'responseGeneration' && h.content) || 
                       (h.phase === 'action' && h.metadata?.toolName && ['sendResponseToUser', 'respond'].includes(h.metadata.toolName) && h.content)
              );
              if (lastMeaningfulEntry?.content) {
                  try {
                      // If content is stringified JSON from a tool, try to parse its message
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
        // Should not happen if ReActEngine correctly sets completionStatus
        console.warn(`[ApplicationLogicService:${chatId}] Unexpected completion status: ${resultState.completionStatus}`);
        finalResponseText = `The process finished with an unexpected status: ${resultState.completionStatus}.`;
      }

      // Persist the conversation (MemoryManager handles the actual storage)
      // This should happen regardless of success/failure to save the history.
      await this.memoryManager.storeConversation(chatId, resultState);
      
      // `endConversation` in ConversationManager doesn't do much critical now,
      // as state is managed per message and persisted above.
      // this.conversationManager.endConversation(chatId); 

      const duration = Date.now() - startTime;
      console.log(`[ApplicationLogicService:${chatId}] Message processing finished. Success: ${resultState.completionStatus === 'completed'}. Duration: ${duration}ms.`);

      return {
        success: resultState.completionStatus === 'completed', // Define success as ReAct cycle completing its goal
        finalResponse: finalResponseText,
        updatedState: resultState,
        error: resultState.completionStatus !== 'completed' ? (resultState.error || 'Processing did not complete successfully.') : undefined,
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[ApplicationLogicService:${chatId}] CRITICAL error processing message (duration: ${duration}ms):`, error);
      const currentState = this.conversationManager.getConversationState(chatId);
      let finalErrorState = currentState || state; // Use 'state' if 'currentState' is somehow undefined

      finalErrorState.completionStatus = 'failed'; // Or 'error'
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
        phase: 'system_message', // Or a specific 'error_boundary' phase
        content: `Critical error in ApplicationLogicService: ${errorMessage}`,
        timestamp: Date.now(),
        iteration: state.iterationCount || 0, // Use current iteration or 0 if not set
        metadata: { status: 'error' }
    });
  }

  public async clearConversation(chatId: string): Promise<void> {
    console.log(`[ApplicationLogicService] Clearing conversation: ${chatId}`);
    // Pass memoryManager to clearConversation if it needs to interact with it
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
    // ToolRegistry.executeTool now returns executionTime
    return this.toolRegistry.executeTool(toolName, params, executionContextArgs);
  }

  public dispose(): void {
    if (this.memoryManager && typeof (this.memoryManager as any).dispose === 'function') {
        (this.memoryManager as any).dispose();
    }
    // ReActEngine doesn't have a dispose method currently
    console.log('[ApplicationLogicService] Disposed.');
  }
}