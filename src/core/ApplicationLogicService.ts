// src/core/ApplicationLogicService.ts
import { SimplifiedOptimizedGraphState } from './langgraph/state/GraphState';
import { ConversationManager } from './ConversationManager';
import { Disposable } from './interfaces/Disposable';
import { LangGraphEngine } from './langgraph/LangGraphEngine';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { EventType } from '../features/events/eventTypes';
import { GraphPhase } from './langgraph/state/GraphState';

import { StateFactory } from './langgraph/state/StateFactory';

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
    private dispatcher: InternalEventDispatcher
  ) { }

  public async processUserMessage(
    chatId: string,
    userMessage: string,
    context?: { files?: string[] }
  ): Promise<ProcessUserMessageResult> {
    const { state: previousTurnFinalState, isNew } = this.conversationManager.getOrCreateConversationState(
      chatId,
    );

    if (isNew) {
      this.conversationManager.setActiveChatId(chatId);
    }

    const engineConfig = this.agentEngine.getConfig();

    let fullInput = userMessage;
    if (context?.files && context.files.length > 0) {
      const fileList = context.files.map(f => `- ${f}`).join('\n');
      fullInput += `\n\nContexto de archivos proporcionado:\n${fileList}`;
    }


    const stateForNewTurn = StateFactory.prepareStateForNewTurn(
      previousTurnFinalState,
      fullInput,
      engineConfig
    );

    this.conversationManager.updateConversationState(chatId, stateForNewTurn);

    this.agentEngine.run(stateForNewTurn)
      .then(finalStateFromRun => {
        this.conversationManager.updateConversationState(chatId, finalStateFromRun);
      })
      .catch((error: any) => {
        console.error(`[ApplicationLogicService] Critical unhandled error from agentEngine.run for chat ${chatId}:`, error);

        this.dispatcher.dispatch(EventType.SYSTEM_ERROR, {
          chatId: chatId,
          message: `Error crítico en el motor del agente: ${error.message}`,
          source: 'ApplicationLogicService.processUserMessage.catch',
          errorObject: error,
        });

        const finalErrorState = this.conversationManager.getConversationState(chatId) || stateForNewTurn;
        finalErrorState.error = error.message || 'Unknown async error in LangGraphEngine.';
        finalErrorState.isCompleted = true;
        finalErrorState.currentPhase = GraphPhase.ERROR;
        this.conversationManager.updateConversationState(chatId, finalErrorState);
      });

    return {
      success: true,
      updatedState: stateForNewTurn
    };
  }

  public async clearConversation(chatId?: string): Promise<boolean> {
    return this.conversationManager.clearConversation(chatId);
  }

  public dispose(): void {
    console.log('[ApplicationLogicService] Disposed.');
  }
}