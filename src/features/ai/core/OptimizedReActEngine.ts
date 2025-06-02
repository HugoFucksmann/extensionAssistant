// src/core/OptimizedReActEngine.ts
import { WindsurfState } from './types';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { ModelManager } from '../features/ai/ModelManager';
import { runOptimizedAnalysisChain } from '../features/ai/lcel/OptimizedAnalysisChain';
import { runOptimizedReasoningChain } from '../features/ai/lcel/OptimizedReasoningChain';
import { runOptimizedResponseChain } from '../features/ai/lcel/OptimizedResponseChain';
import { ReasoningOutput } from '../features/ai/prompts/optimized/reasoningPrompt';
import { ResponseOutput } from '../features/ai/prompts/optimized/responsePrompt';
import { ReActCycleMemory } from '../features/memory/ReActCycleMemory';
import { LongTermStorage } from '../features/memory/LongTermStorage';

// Managers
import { ReActCycleManager } from './ReActCycleManager';
import { HistoryManager } from './HistoryManager';
import { EventManager } from './EventManager';
import { ToolExecutionManager } from './ToolExecutionManager';
import { ZodSchemaUtils } from '../shared/utils/zodUtils';

export class OptimizedReActEngine {
  private toolsDescriptionCache: string | null = null;
  private cycleManager: ReActCycleManager;
  private eventManager: EventManager;
  private toolExecutionManager: ToolExecutionManager;

  constructor(
    private modelManager: ModelManager,
    private toolRegistry: ToolRegistry,
    private dispatcher: InternalEventDispatcher,
    private longTermStorage: LongTermStorage,
    maxIterations: number = 10
  ) {
    this.cycleManager = new ReActCycleManager(maxIterations);
    this.eventManager = new EventManager(dispatcher);
    this.toolExecutionManager = new ToolExecutionManager(toolRegistry);
    
    this.dispatcher.systemInfo(
      'OptimizedReActEngine initialized.', 
      { source: 'OptimizedReActEngine' }, 
      'OptimizedReActEngine'
    );
  }

  private getToolsDescription(): string {
    if (this.toolsDescriptionCache) {
      return this.toolsDescriptionCache;
    }

    this.toolsDescriptionCache = this.toolRegistry.getAllTools()
      .map(tool => {
        const paramsDescription = tool.parametersSchema 
          ? ZodSchemaUtils.toToolDescription(tool.parametersSchema)
          : 'No parameters required';
        
        return `${tool.name}: ${tool.description}\nParameters: ${paramsDescription}`;
      })
      .join('\n\n');
    
    return this.toolsDescriptionCache;
  }

  public async run(initialState: WindsurfState): Promise<WindsurfState> {
    const currentState = { ...initialState };
    const startTime = Date.now();
    
    // Initialize state
    this.initializeState(currentState);
    
    // Setup memory and cycle management
    const memory = await this.setupMemory(currentState);
    this.cycleManager.initializeFromState(currentState);
    
    try {
      // Initial analysis phase
      const analysisResult = await this.performInitialAnalysis(currentState, memory);
      
      // Main reasoning-action cycle
      await this.executeMainCycle(currentState, memory, analysisResult);
      
      // Generate final response if needed
      await this.generateFinalResponse(currentState, memory, analysisResult);
      
      currentState.completionStatus = 'completed';
      
    } catch (error: any) {
      this.handleError(currentState, error);
    }
    
    // Dispatch final response event
    this.dispatchFinalResponseEvent(currentState, startTime);
    
    return currentState;
  }

  private initializeState(state: WindsurfState): void {
    state.iterationCount = state.iterationCount || 0;
    state.history = state.history || [];
  }

  private async setupMemory(state: WindsurfState): Promise<ReActCycleMemory> {
    const memory = new ReActCycleMemory(
      this.longTermStorage,
      state.chatId,
      { 
        userQuery: state.userMessage || '',
        activeFile: state.context?.activeFile, 
        workspaceRoot: state.context?.workspaceRoot 
      }
    );
    
    await memory.retrieveRelevantMemory(state.userMessage || '');
    return memory;
  }

  private async performInitialAnalysis(
    state: WindsurfState, 
    memory: ReActCycleMemory
  ): Promise<any> {
    this.eventManager.dispatchPhaseEvent(
      'initialAnalysis', 'started', state.chatId, state.iterationCount
    );
    
    const model = this.modelManager.getActiveModel();
    console.log('[OptimizedReActEngine] --- Initial analysis phase ---');
    
    const analysisResult = await runOptimizedAnalysisChain({
      userQuery: state.userMessage || '',
      availableTools: this.toolRegistry.getToolNames(),
      codeContext: JSON.stringify(state.editorContext || state.projectContext || {}),
      memoryContext: memory.getMemorySummary(),
      model
    });
    
    console.log('[OptimizedReActEngine] Analysis result:', 
      JSON.stringify(analysisResult, null, 2));
    
    HistoryManager.addEntry(state, 'reasoning', analysisResult, { 
      phase_details: 'initial_analysis' 
    });
    
    this.eventManager.dispatchPhaseEvent(
      'initialAnalysis', 'completed', state.chatId, state.iterationCount, 
      { analysis: analysisResult }
    );
    
    memory.addToShortTermMemory({
      type: 'context',
      content: analysisResult.understanding,
      relevance: 1.0
    });
    
    return analysisResult;
  }

  private async executeMainCycle(
    state: WindsurfState,
    memory: ReActCycleMemory,
    analysisResult: any
  ): Promise<void> {
    const model = this.modelManager.getActiveModel();
    
    while (true) {
      const { iterationNumber, shouldContinue } = this.cycleManager.startIteration();
      
      if (!shouldContinue) break;
      
      console.log(`[OptimizedReActEngine] --- Iteration ${iterationNumber} ---`);
      
      // Reasoning phase
      const reasoningResult = await this.performReasoning(
        state, memory, analysisResult, model, iterationNumber
      );
      
      if (reasoningResult.nextAction === 'respond') {
        state.finalOutput = reasoningResult.response || 
          'No specific response content provided by model.';
        this.cycleManager.markCompleted();
        break;
      }
      
      // Tool execution phase
      if (reasoningResult.nextAction === 'use_tool') {
        const shouldContinue = await this.executeToolPhase(
          state, memory, reasoningResult, model
        );
        
        if (!shouldContinue) break;
      }
      
      this.cycleManager.updateState(state);
    }
  }

  private async performReasoning(
    state: WindsurfState,
    memory: ReActCycleMemory,
    analysisResult: any,
    model: any,
    iterationNumber: number
  ): Promise<ReasoningOutput> {
    this.eventManager.dispatchPhaseEvent(
      'reasoning', 'started', state.chatId, iterationNumber
    );
    
    const reasoningResult = await runOptimizedReasoningChain({
      userQuery: state.userMessage || '',
      analysisResult,
      toolsDescription: this.getToolsDescription(),
      previousToolResults: this.cycleManager.getPreviousToolResults(),
      memoryContext: memory.getMemorySummary(),
      model
    });
    
    console.log('[OptimizedReActEngine] Reasoning result:', 
      JSON.stringify(reasoningResult, null, 2));
    
    HistoryManager.addEntry(state, 'reasoning', reasoningResult);
    
    this.eventManager.dispatchPhaseEvent(
      'reasoning', 'completed', state.chatId, iterationNumber, 
      { reasoning: reasoningResult }
    );
    
    return reasoningResult;
  }

  private async executeToolPhase(
    state: WindsurfState,
    memory: ReActCycleMemory,
    reasoningResult: ReasoningOutput,
    model: any
  ): Promise<boolean> {
    // Check for tool deduplication
    if (this.cycleManager.shouldSkipTool(reasoningResult, state.chatId)) {
      return true; // Continue cycle
    }

    if (!reasoningResult.tool) {
      const errorMsg = "Model decided to use a tool but did not specify which tool.";
      console.warn(`[OptimizedReActEngine] ${errorMsg}`);
      HistoryManager.addSystemMessage(state, errorMsg, 'error');
      state.finalOutput = "I tried to use a tool, but I'm unsure which one. Can you clarify?";
      this.cycleManager.markCompleted();
      return false; // Stop cycle
    }

    const operationId = `${state.chatId || 'nochat'}-${Date.now()}-${reasoningResult.tool}`;
    
    console.log(`[OptimizedReActEngine] Executing tool: ${reasoningResult.tool} with parameters:`, 
      reasoningResult.parameters);

    try {
      // Execute tool with analysis
      const executionResult = await this.toolExecutionManager.executeToolWithAnalysis(
        reasoningResult,
        {
          chatId: state.chatId,
          operationId,
          userQuery: state.userMessage || '',
          memory,
          model
        },
        this.cycleManager.getPreviousToolResults()
      );

      console.log(`[OptimizedReActEngine] Tool result (${reasoningResult.tool}):`, 
        JSON.stringify(executionResult.toolResult, null, 2));

      // Add to cycle manager
      this.cycleManager.addToolExecution(reasoningResult.tool, executionResult.toolResult);

      // Update history
      HistoryManager.addToolExecutionEntry(
        state,
        reasoningResult.tool,
        reasoningResult.parameters,
        executionResult.toolResult.mappedOutput,
        executionResult.success,
        executionResult.error,
        executionResult.duration
      );

      // Update memory
      this.updateMemoryWithToolResult(memory, reasoningResult.tool, executionResult);

      // Add action analysis to history if available
      if (executionResult.actionAnalysis) {
        HistoryManager.addEntry(state, 'action', executionResult.actionAnalysis, { 
          phase_details: 'action_interpretation' 
        });
      }

      // Dispatch tool completion event
      this.eventManager.dispatchToolCompletion(
        reasoningResult.tool,
        reasoningResult.parameters,
        state.chatId,
        operationId,
        executionResult.toolResult,
        executionResult.duration,
        this.toolExecutionManager.getToolDescription(reasoningResult.tool),
        executionResult.actionAnalysis
      );

      // Check if model decided to respond after tool use
      if (executionResult.actionAnalysis?.nextAction === 'respond') {
        state.finalOutput = executionResult.actionAnalysis.response || 
          'No specific response content provided by model after tool use.';
        this.cycleManager.markCompleted();
        return false; // Stop cycle
      }

      return true; // Continue cycle

    } catch (error: any) {
      this.handleToolExecutionError(state, reasoningResult.tool!, operationId, error);
      return true; // Continue cycle despite error
    }
  }

  private updateMemoryWithToolResult(
    memory: ReActCycleMemory,
    toolName: string,
    executionResult: any
  ): void {
    const resultSummary = executionResult.success
      ? (typeof executionResult.toolResult.mappedOutput?.message === 'string' 
          ? executionResult.toolResult.mappedOutput.message.substring(0, 200)
          : typeof executionResult.toolResult.data === 'string' 
            ? executionResult.toolResult.data.substring(0, 200)
            : 'Data obtained successfully')
      : `Error: ${executionResult.error}`;

    memory.addToShortTermMemory({
      type: 'tools',
      content: {
        tool: toolName,
        result: resultSummary
      },
      relevance: 0.9
    });
  }

  private handleToolExecutionError(
    state: WindsurfState,
    toolName: string,
    operationId: string,
    error: any
  ): void {
    const errorMessage = `Error during tool execution or analysis for ${toolName}: ${error.message}`;
    HistoryManager.addSystemMessage(state, errorMessage, 'error');
    
    this.eventManager.dispatchToolCompletion(
      toolName,
      undefined,
      state.chatId,
      operationId,
      {
        success: false,
        error: error.message,
        data: null,
        mappedOutput: null
      },
      0,
      this.toolExecutionManager.getToolDescription(toolName),
      null
    );
  }

  private async generateFinalResponse(
    state: WindsurfState,
    memory: ReActCycleMemory,
    analysisResult: any
  ): Promise<void> {
    if (state.finalOutput || !this.cycleManager.shouldGenerateFinalResponse()) {
      return;
    }

    this.eventManager.dispatchPhaseEvent(
      'finalResponseGeneration', 'started', state.chatId, state.iterationCount
    );
    
    const model = this.modelManager.getActiveModel();
    const responseResult = await runOptimizedResponseChain({
      userQuery: state.userMessage || '',
      toolResults: this.cycleManager.getToolResultsForChains(),
      analysisResult,
      memoryContext: memory.getMemorySummary(),
      model
    }) as ResponseOutput;
    
    state.finalOutput = responseResult.response || 
      "The process completed, but no specific final response was generated.";
    
    HistoryManager.addEntry(state, 'responseGeneration', responseResult);
    
    this.eventManager.dispatchPhaseEvent(
      'finalResponseGeneration', 'completed', state.chatId, state.iterationCount, 
      { response: responseResult }
    );
  }

  private handleError(state: WindsurfState, error: any): void {
    console.error('[OptimizedReActEngine] Error during execution:', error);
    state.error = error.message;
    state.completionStatus = 'failed';
    
    this.eventManager.dispatchSystemError(
      error.message,
      state.chatId,
      error,
      { stack: error.stack }
    );
  }

  private dispatchFinalResponseEvent(state: WindsurfState, startTime: number): void {
    if (!state.finalOutput) return;

    const responseContent = typeof state.finalOutput === 'string'
      ? state.finalOutput
      : JSON.stringify(state.finalOutput, null, 2);

    this.eventManager.dispatchFinalResponse(
      responseContent,
      state.chatId,
      Date.now() - startTime,
      this.cycleManager.getStats()
    );
  }

  public dispose(): void {
    this.toolsDescriptionCache = null;
  }
}