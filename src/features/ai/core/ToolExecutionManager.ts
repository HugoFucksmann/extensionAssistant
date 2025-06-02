// src/core/ToolExecutionManager.ts
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { ToolResult as InternalToolResult } from '../features/tools/types';
import { ReasoningOutput } from '../features/ai/prompts/optimized/reasoningPrompt';
import { ActionOutput } from '../features/ai/prompts/optimized/actionPrompt';
import { runOptimizedActionChain } from '../features/ai/lcel/OptimizedActionChain';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { ReActCycleMemory } from '../features/memory/ReActCycleMemory';

export interface ToolExecutionContext {
  chatId: string | null;
  operationId: string;
  userQuery: string;
  memory: ReActCycleMemory;
  model: BaseLanguageModel;
}

export interface ToolExecutionResult {
  success: boolean;
  toolResult: InternalToolResult;
  actionAnalysis?: ActionOutput;
  duration: number;
  error?: string;
}

export class ToolExecutionManager {
  constructor(private toolRegistry: ToolRegistry) {}

  /**
   * Execute tool and analyze result
   */
  async executeToolWithAnalysis(
    reasoning: ReasoningOutput,
    context: ToolExecutionContext,
    previousActions: Array<{ tool: string; result: any }> = []
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    if (!reasoning.tool) {
      return {
        success: false,
        toolResult: {
          success: false,
          error: "No tool specified in reasoning output",
          data: null,
          mappedOutput: null
        },
        duration: Date.now() - startTime,
        error: "No tool specified"
      };
    }

    try {
      // Execute tool
      const toolResult = await this.toolRegistry.executeTool(
        reasoning.tool,
        reasoning.parameters ?? {},
        { 
          chatId: context.chatId, 
          operationId: context.operationId 
        }
      );

      // Analyze tool result
      const actionAnalysis = await this.analyzeToolResult(
        reasoning.tool,
        toolResult,
        context,
        previousActions
      );

      return {
        success: toolResult.success,
        toolResult,
        actionAnalysis,
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        success: false,
        toolResult: {
          success: false,
          error: error.message,
          data: null,
          mappedOutput: null
        },
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Analyze tool execution result
   */
  private async analyzeToolResult(
    toolName: string,
    toolResult: InternalToolResult,
    context: ToolExecutionContext,
    previousActions: Array<{ tool: string; result: any }>
  ): Promise<ActionOutput> {
    return runOptimizedActionChain({
      userQuery: context.userQuery,
      lastToolName: toolName,
      lastToolResult: toolResult.data ?? toolResult.error ?? "No data/error from tool",
      previousActions,
      memoryContext: context.memory.getMemorySummary(),
      model: context.model
    });
  }

  /**
   * Check if tool exists
   */
  hasToolName(toolName: string): boolean {
    return this.toolRegistry.getTool(toolName) !== null;
  }

  /**
   * Get tool description
   */
  getToolDescription(toolName: string): string | undefined {
    return this.toolRegistry.getTool(toolName)?.description;
  }
}