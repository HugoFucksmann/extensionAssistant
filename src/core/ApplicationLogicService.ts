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

    const { state: convState, isNew } = this.conversationManager.getOrCreateConversationState(
      chatId,
      userMessage,
      contextData
    );
    if (isNew) {
      this.conversationManager.setActiveChatId(chatId);
    }

    try {

      this.agentEngine.run(userMessage, chatId)
        .catch((error: any) => {

          convState.error = error.message || 'Unknown async error in LangGraphEngine.';
          this.conversationManager.updateConversationState(chatId, convState);

        });


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