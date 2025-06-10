// src/core/ApplicationLogicService.ts
import { ExecutionState } from './execution/ExecutionState';
import { ConversationManager } from './ConversationManager';
import { Disposable } from './interfaces/Disposable';
import { ExecutionEngine, ExecutionResult, ExecutionMode } from './execution/ExecutionEngine';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { EventType } from '../features/events/eventTypes';

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
    const { state: existingState, isNew } = this.conversationManager.getOrCreateConversationState(
      chatId,
      userMessage,
      options
    );

    if (isNew) {
      this.conversationManager.setActiveChatId(chatId);
    }

    // Set execution mode if provided
    if (options.executionMode) {
      this.executionEngine.setMode(options.executionMode);
    }

    // Create execution context
    const executionState: ExecutionState = {
      ...existingState.executionState,
      sessionId: chatId,
      mode: options.executionMode || this.executionEngine.currentMode,
      currentQuery: userMessage,
      workspaceFiles: options.workspaceFiles || this.getWorkspaceFiles(options),
      activeFile: options.activeFile,
      userContext: options,
      step: 0,
      errorCount: 0,
      lastResult: existingState.executionState?.lastResult ?? null, // <--- AGREGAR ESTO
      createdAt: new Date(),
      updatedAt: new Date(),
      executionStatus: 'planning'
    };

    // Update conversation state with execution state
    this.conversationManager.updateConversationState(chatId, {
      ...existingState,
      executionState,
      userInput: userMessage,
      isCompleted: false,
      error: undefined
    });

    // Dispatch execution started event
    this.dispatcher.dispatch(EventType.CONVERSATION_TURN_STARTED, {
      chatId,
      userMessage,
      executionMode: executionState.mode,
      timestamp: Date.now()
    });

    // Execute task asynchronously
    this.executeTaskAsync(chatId, userMessage, executionState);

    return {
      success: true,
      updatedState: executionState
    };
  }

  private async executeTaskAsync(
    chatId: string,
    userMessage: string,
    executionState: ExecutionState
  ): Promise<void> {
    try {
      const startTime = Date.now();

      // Dispatch task execution started
      this.dispatcher.dispatch(EventType.TASK_EXECUTION_STARTED, {
        chatId,
        query: userMessage,
        mode: executionState.mode,
        timestamp: startTime
      });

      const result: ExecutionResult = await this.executionEngine.executeTask(userMessage);
      const executionTime = Date.now() - startTime;

      // Update conversation with results
      const conversationState = this.conversationManager.getConversationState(chatId);
      if (conversationState) {
        this.conversationManager.updateConversationState(chatId, {
          ...conversationState,
          executionState: this.executionEngine.state,
          isCompleted: true,
          error: result.success ? undefined : result.error,
          finalResponse: this.formatFinalResponse(result)
        });
      }

      // Dispatch completion events
      if (result.success) {
        this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, {
          chatId,
          response: this.formatFinalResponse(result),
          executionTime,
          mode: executionState.mode,
          metadata: result.data,
          timestamp: Date.now()
        });
      }

      this.dispatcher.dispatch(EventType.CONVERSATION_TURN_COMPLETED, {
        chatId,
        success: result.success,
        executionTime,
        mode: executionState.mode,
        timestamp: Date.now()
      });

    } catch (error: any) {
      console.error(`[ApplicationLogicService] Error executing task for chat ${chatId}:`, error);

      // Update conversation with error
      const conversationState = this.conversationManager.getConversationState(chatId);
      if (conversationState) {
        this.conversationManager.updateConversationState(chatId, {
          ...conversationState,
          executionState: this.executionEngine.state,
          isCompleted: true,
          error: error.message || 'Unknown execution error'
        });
      }

      // Dispatch error event
      this.dispatcher.dispatch(EventType.SYSTEM_ERROR, {
        chatId: chatId,
        message: `Error in execution engine: ${error.message}`,
        source: 'ApplicationLogicService.executeTaskAsync',
        errorObject: error,
        level: 'error',
        timestamp: Date.now()
      });
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

  private getWorkspaceFiles(options: ProcessUserMessageOptions): string[] {
    return options.workspaceFiles || options.files || [];
  }

  public async clearConversation(chatId?: string): Promise<boolean> {
    return this.conversationManager.clearConversation(chatId);
  }

  public async setExecutionMode(mode: ExecutionMode): Promise<void> {
    this.executionEngine.setMode(mode);

    // Dispatch mode change event
    this.dispatcher.dispatch(EventType.EXECUTION_MODE_CHANGED, {
      mode,
      timestamp: Date.now()
    });
  }

  public getCurrentExecutionMode(): ExecutionMode {
    return this.executionEngine.currentMode;
  }

  public getAvailableExecutionModes(): ExecutionMode[] {
    // Supervised mode is now available
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