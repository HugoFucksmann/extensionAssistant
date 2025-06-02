// src/core/ReActCycleManager.ts
import { WindsurfState } from './types';
import { HistoryEntry } from '../features/chat/types';
import { ToolResult as InternalToolResult } from '../features/tools/types';
import { ReasoningOutput } from '../features/ai/prompts/optimized/reasoningPrompt';
import { ActionOutput } from '../features/ai/prompts/optimized/actionPrompt';

export interface ToolExecution {
  tool: string;
  toolCallResult: InternalToolResult;
}

export interface CycleState {
  iterationCount: number;
  toolResultsAccumulator: ToolExecution[];
  executedTools: Set<string>;
  isCompleted: boolean;
  maxIterations: number;
}

export class ReActCycleManager {
  private cycleState: CycleState;

  constructor(maxIterations: number = 10) {
    this.cycleState = {
      iterationCount: 0,
      toolResultsAccumulator: [],
      executedTools: new Set<string>(),
      isCompleted: false,
      maxIterations
    };
  }

  /**
   * Initialize cycle state from WindsurfState
   */
  initializeFromState(state: WindsurfState): void {
    this.cycleState.iterationCount = state.iterationCount || 0;
    this.cycleState.executedTools = state._executedTools || new Set<string>();
  }

  /**
   * Start new iteration
   */
  startIteration(): { iterationNumber: number; shouldContinue: boolean } {
    this.cycleState.iterationCount++;
    const shouldContinue = !this.cycleState.isCompleted && 
                          this.cycleState.iterationCount < this.cycleState.maxIterations;
    
    return {
      iterationNumber: this.cycleState.iterationCount,
      shouldContinue
    };
  }

  /**
   * Check if tool execution should be skipped due to deduplication
   */
  shouldSkipTool(reasoning: ReasoningOutput, chatId: string | null): boolean {
    if (!reasoning.tool) return true;

    const execKey = this.createToolExecutionKey(
      reasoning.tool,
      reasoning.parameters,
      chatId
    );

    if (this.cycleState.executedTools.has(execKey)) {
      console.warn(`Tool deduplication: ${reasoning.tool} with same parameters already executed`);
      return true;
    }

    this.cycleState.executedTools.add(execKey);
    return false;
  }

  /**
   * Add tool execution result
   */
  addToolExecution(tool: string, result: InternalToolResult): void {
    this.cycleState.toolResultsAccumulator.push({
      tool,
      toolCallResult: result
    });
  }

  /**
   * Mark cycle as completed
   */
  markCompleted(): void {
    this.cycleState.isCompleted = true;
  }

  /**
   * Check if should generate final response
   */
  shouldGenerateFinalResponse(): boolean {
    return !this.cycleState.isCompleted && 
           this.cycleState.iterationCount >= this.cycleState.maxIterations;
  }

  /**
   * Get tool results for chains
   */
  getToolResultsForChains(): Array<{ tool: string; result: any }> {
    return this.cycleState.toolResultsAccumulator.map(tr => ({
      tool: tr.tool,
      result: tr.toolCallResult.data ?? 
              tr.toolCallResult.error ?? 
              "No data/error from tool"
    }));
  }

  /**
   * Get previous tool results (excluding last one)
   */
  getPreviousToolResults(): Array<{ tool: string; result: any }> {
    const results = this.getToolResultsForChains();
    return results.slice(0, -1);
  }

  /**
   * Update WindsurfState with cycle information
   */
  updateState(state: WindsurfState): void {
    state.iterationCount = this.cycleState.iterationCount;
    state._executedTools = this.cycleState.executedTools;
  }

  /**
   * Get cycle statistics
   */
  getStats(): {
    iterations: number;
    toolExecutions: number;
    uniqueTools: number;
    isCompleted: boolean;
  } {
    const uniqueTools = new Set(
      this.cycleState.toolResultsAccumulator.map(tr => tr.tool)
    );

    return {
      iterations: this.cycleState.iterationCount,
      toolExecutions: this.cycleState.toolResultsAccumulator.length,
      uniqueTools: uniqueTools.size,
      isCompleted: this.cycleState.isCompleted
    };
  }

  private createToolExecutionKey(
    tool: string,
    params: any,
    chatId: string | null
  ): string {
    const normalizeParams = (obj: any): any => {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
      
      return Object.keys(obj)
        .sort()
        .reduce((acc, key) => {
          acc[key] = normalizeParams(obj[key]);
          return acc;
        }, {} as any);
    };

    return `${chatId || 'nochat'}::${tool}::${JSON.stringify(normalizeParams(params || {}))}`;
  }
}