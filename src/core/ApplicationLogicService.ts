// src/core/ApplicationLogicService.ts
import { WindsurfState } from './types';
import { MemoryManager } from '../features/memory/MemoryManager';
import { OptimizedReActEngine } from './OptimizedReActEngine';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { ConversationManager } from './ConversationManager';
import { ToolResult } from '../features/tools/types';
import { addErrorToHistory } from './utils/historyUtils';

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
      const resultState = await this.reActEngine.run(state);
      this.conversationManager.updateConversationState(chatId, resultState);
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
    addErrorToHistory(state, `Critical error in ApplicationLogicService: ${errorMessage}`);
  }

  public async clearConversation(chatId?: string): Promise<boolean> {
    return this.conversationManager.clearConversation(chatId, this.memoryManager);
  }

  public async invokeTool(
    toolName: string,
    params: any,
    executionContextArgs: { chatId?: string; [key: string]: any } = {}
  ): Promise<ToolResult> {
    return this.toolRegistry.executeTool(toolName, params, executionContextArgs);
  }

  public dispose(): void {
    if (this.memoryManager && typeof (this.memoryManager as any).dispose === 'function') {
        (this.memoryManager as any).dispose();
    }
  
    
  }
}