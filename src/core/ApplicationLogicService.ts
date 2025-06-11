// src/core/ApplicationLogicService.ts
import { ExecutionState } from './execution/ExecutionState';
import { ConversationManager } from './ConversationManager';
import { Disposable } from './interfaces/Disposable';
import { ExecutionEngine, ExecutionResult, ExecutionMode } from './execution/ExecutionEngine';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { 
  EventType, 
  TaskExecutionStartedPayload, 
  SystemEventPayload, 
  ConversationTurnStartedPayload,
  ExecutionModeChangedPayload,
  ConversationTurnCompletedPayload,
  ResponseGeneratedPayload
} from '../features/events/eventTypes';

export interface ProcessUserMessageOptions {
  files?: string[];
  executionMode?: ExecutionMode;
  activeFile?: string;
  workspaceFiles?: string[];
}

export interface ProcessUserMessageResult {
  success: boolean;
  finalResponse?: string;
  updatedState?: ExecutionState;
  error?: string;
}

export class ApplicationLogicService implements Disposable {
  constructor(
    private executionEngine: ExecutionEngine,
    private conversationManager: ConversationManager,
    private toolRegistry: ToolRegistry,
    private dispatcher: InternalEventDispatcher
  ) { }

  public async processUserMessage(
    chatId: string,
    userMessage: string,
    options: ProcessUserMessageOptions = {}
  ): Promise<ProcessUserMessageResult> {
    // Get or create conversation state with centralized ExecutionState creation
    const { state: conversationState, isNew } = this.conversationManager.getOrCreateConversationState(
      chatId,
      userMessage,
      { ...options, userMessage }
    );

    if (isNew) {
      this.conversationManager.setActiveChatId(chatId);
    }

    // Update execution mode if provided
    if (options.executionMode) {
      this.executionEngine.setMode(options.executionMode);
      this.conversationManager.updateExecutionState(chatId, {
        mode: options.executionMode
      });
    }

    // Update execution state with current query and context
    this.conversationManager.updateExecutionState(chatId, {
      currentQuery: userMessage,
      workspaceFiles: options.workspaceFiles || options.files || [],
      activeFile: options.activeFile,
      userContext: options,
      executionStatus: 'planning'
    });

    // Mark conversation as started
    this.conversationManager.updateConversationState(chatId, {
      userInput: userMessage,
      isCompleted: false,
      error: undefined
    });

    // Dispatch execution started event
    const turnStartedPayload: Omit<import('../features/events/eventTypes').ConversationTurnStartedPayload, 'timestamp'> = {
      chatId,
      userMessage,
      executionMode: conversationState.executionState.mode
    };
    this.dispatcher.dispatch(EventType.CONVERSATION_TURN_STARTED, turnStartedPayload);

    // Execute task asynchronously
    this.executeTaskAsync(chatId, userMessage);

    const updatedState = this.conversationManager.getConversationState(chatId);
    return {
      success: true,
      updatedState: updatedState?.executionState
    };
  }

  private async executeTaskAsync(
    chatId: string,
    userMessage: string
  ): Promise<void> {
    try {
      const startTime = Date.now();
      const conversationState = this.conversationManager.getConversationState(chatId);

      if (!conversationState) {
        throw new Error(`No conversation state found for chatId: ${chatId}`);
      }

      // Dispatch task execution started
      const taskStartPayload: Omit<TaskExecutionStartedPayload, 'timestamp'> = {
        chatId,
        query: userMessage,
        mode: conversationState.executionState.mode
      };
      this.dispatcher.dispatch(EventType.TASK_EXECUTION_STARTED, taskStartPayload);

      // Update execution status
      this.conversationManager.updateExecutionState(chatId, {
        executionStatus: 'executing'
      });

      const result: ExecutionResult = await this.executionEngine.executeTask(userMessage);
      const executionTime = Date.now() - startTime;

      // Update conversation with results
      this.conversationManager.updateConversationState(chatId, {
        isCompleted: true,
        error: result.success ? undefined : result.error,
        finalResponse: this.formatFinalResponse(result)
      });

      // Update execution state from engine
      this.conversationManager.updateExecutionState(chatId, {
        ...this.executionEngine.state,
        executionStatus: result.success ? 'completed' : 'error',
        lastResult: result.data
      });

      // Dispatch completion events
      if (result.success) {
        const responsePayload: Omit<ResponseGeneratedPayload, 'timestamp'> = {
          chatId,
          response: this.formatFinalResponse(result),
          executionTime,
          mode: conversationState.executionState.mode,
          metadata: result.data,
          source: 'ApplicationLogicService'
        };
        this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, responsePayload);
      }

      const turnCompletedPayload: Omit<ConversationTurnCompletedPayload, 'timestamp'> = {
        chatId,
        success: result.success,
        executionTime,
        mode: conversationState.executionState.mode
      };
      this.dispatcher.dispatch(EventType.CONVERSATION_TURN_COMPLETED, turnCompletedPayload);

    } catch (error: any) {
      console.error(`[ApplicationLogicService] Error executing task for chat ${chatId}:`, error);

      // Update conversation with error
      this.conversationManager.updateConversationState(chatId, {
        isCompleted: true,
        error: error.message || 'Unknown execution error'
      });

      // Update execution state with error
      this.conversationManager.updateExecutionState(chatId, {
        executionStatus: 'error',
        lastError: error
      });

      // Dispatch error event
      const errorPayload: Omit<SystemEventPayload, 'timestamp'> = {
        chatId: chatId,
        message: `Error in execution engine: ${error.message}`,
        source: 'ApplicationLogicService.executeTaskAsync',
        errorObject: error,
        level: 'error'
      };
      this.dispatcher.dispatch(EventType.SYSTEM_ERROR, errorPayload);
    }
  }

  private formatFinalResponse(result: ExecutionResult): string {
    if (result.success) {
      if (result.data && result.data.response) {
        return result.data.response;
      }
      return 'Task completed successfully.';
    } else {
      return `Task failed: ${result.error || 'Unknown error'}`;
    }
  }

  public async clearConversation(chatId?: string): Promise<boolean> {
    return this.conversationManager.clearConversation(chatId);
  }

  public async setExecutionMode(mode: ExecutionMode): Promise<void> {
    this.executionEngine.setMode(mode);

    // Update active conversation's execution mode if exists
    const activeChatId = this.conversationManager.getActiveChatId();
    if (activeChatId) {
      this.conversationManager.updateExecutionState(activeChatId, { mode });
    }

    // Dispatch mode change event
    const modeChangedPayload: Omit<ExecutionModeChangedPayload, 'timestamp'> = {
      mode
    };
    this.dispatcher.dispatch(EventType.EXECUTION_MODE_CHANGED, modeChangedPayload);
  }

  public getCurrentExecutionMode(): ExecutionMode {
    return this.executionEngine.currentMode;
  }

  public getAvailableExecutionModes(): ExecutionMode[] {
    return ['simple', 'planner', 'supervised'];
  }

  public getExecutionProgress(): number {
    return this.executionEngine.getProgress();
  }

  public async createCheckpoint(): Promise<void> {
    await this.executionEngine.createCheckpoint();
  }

  public async pauseExecution(): Promise<void> {
    await this.executionEngine.pause();
  }

  public async resumeExecution(): Promise<void> {
    await this.executionEngine.resume();
  }

  public async stopExecution(): Promise<void> {
    await this.executionEngine.stop();
  }

  public getExecutionState(): ExecutionState {
    return this.executionEngine.state;
  }

  public dispose(): void {
    if (this.executionEngine && typeof this.executionEngine.dispose === 'function') {
      this.executionEngine.dispose();
    }
    console.log('[ApplicationLogicService] Disposed.');
  }
}