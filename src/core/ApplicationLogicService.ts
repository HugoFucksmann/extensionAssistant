// src/core/ApplicationLogicService.ts
import { SimplifiedOptimizedGraphState } from './langgraph/state/GraphState';
import { ConversationManager } from './ConversationManager';
import { Disposable } from './interfaces/Disposable';
import { LangGraphEngine } from './langgraph/LangGraphEngine';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { EventType } from '../features/events/eventTypes';
import { HumanMessage } from '@langchain/core/messages';
import { GraphPhase } from './langgraph/state/GraphState';

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
    private toolRegistry: ToolRegistry,
    private dispatcher: InternalEventDispatcher
  ) { }

  public async processUserMessage(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any> = {}
  ): Promise<ProcessUserMessageResult> {
    const { state: existingState, isNew } = this.conversationManager.getOrCreateConversationState(
      chatId,
      userMessage,
      contextData
    );

    if (isNew) {
      this.conversationManager.setActiveChatId(chatId);
    }

    // CAMBIO: Obtener la configuración actual del motor.
    const engineConfig = this.agentEngine.getConfig();

    const stateForNewTurn: SimplifiedOptimizedGraphState = {
      ...existingState,
      userInput: userMessage,
      messages: [...existingState.messages, new HumanMessage(userMessage)],
      error: undefined,
      isCompleted: false,
      requiresValidation: false,
      lastToolOutput: undefined,
      currentPlan: [],
      currentTask: undefined,
      toolsUsed: [],
      iteration: 0,
      nodeIterations: {
        ANALYSIS: 0,
        EXECUTION: 0,
        VALIDATION: 0,
        RESPONSE: 0,
        COMPLETED: 0,
        ERROR: 0,
        ERROR_HANDLER: 0,
      },
      startTime: Date.now(),
      currentPhase: GraphPhase.ANALYSIS,
      // CAMBIO: Aplicar la configuración del motor al estado del turno.
      maxGraphIterations: engineConfig.maxGraphIterations,
      maxNodeIterations: engineConfig.maxNodeIterations,
    };

    this.conversationManager.updateConversationState(chatId, stateForNewTurn);

    this.agentEngine.run(stateForNewTurn)
      .then(finalState => {
        this.conversationManager.updateConversationState(chatId, finalState);
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