// src/features/tools/ToolRegistry.ts
import { ToolDefinition, ToolResult, ToolExecutionContext } from './types';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import * as vscode from 'vscode';
import { ToolValidator } from './ToolValidator';
import { generateUniqueId } from '../../shared/utils/generateIds';
import { EventType } from '../../features/events/eventTypes';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { PerformanceMonitor } from '../../core/monitoring/PerformanceMonitor';
import { CacheManager } from '../../core/utils/CacheManager';
import { Disposable } from '../../core/interfaces/Disposable';


export class ToolRegistry {
  private tools = new Map<string, ToolDefinition<any, any>>();

  constructor(
    private dispatcher: InternalEventDispatcher,
    private performanceMonitor: PerformanceMonitor,
    private cacheManager: CacheManager
  ) { }

  /**
   * Registers a list of tool definitions.
   * @param toolsToRegister An array of tool definitions to add to the registry.
   */
  public registerTools(toolsToRegister: ToolDefinition<any, any>[]): void {
    for (const tool of toolsToRegister) {
      if (this.tools.has(tool.name)) {
        this.dispatcher.systemWarning(`Tool "${tool.name}" is already registered. Overwriting.`, { toolName: tool.name }, 'ToolRegistry');
      }
      this.tools.set(tool.name, tool);
    }
    this.dispatcher.systemInfo(`Registered ${toolsToRegister.length} tools. Total tools: ${this.tools.size}.`, { registeredNow: toolsToRegister.map(t => t.name) }, 'ToolRegistry');
  }

  getTool(name: string): ToolDefinition<any, any> | undefined {
    return this.tools.get(name);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  getAllTools(): ToolDefinition<any, any>[] {
    return Array.from(this.tools.values());
  }

  async executeTool<T = any>(
    name: string,
    rawParams: any,
    executionCtxArgs: { chatId?: string; operationId?: string;[key: string]: any } = {}
  ): Promise<ToolResult<T>> {
    const operationId = executionCtxArgs.operationId || generateUniqueId();
    const startTime = Date.now();
    const tool = this.getTool(name);

    // 1. Check cache
    const cacheKey = `tool:${name}:${this.cacheManager.hashInput(rawParams)}`;
    const cachedResult = this.cacheManager.get<ToolResult<T>>(cacheKey);
    if (cachedResult) {
      console.log(`[ToolRegistry] Cache hit for tool "${name}".`);
      cachedResult.executionTime = Date.now() - startTime;
      this.dispatchCompletionEvent(name, rawParams, operationId, executionCtxArgs.chatId, cachedResult, true);
      return cachedResult;
    }
    console.log(`[ToolRegistry] Cache miss for tool "${name}". Executing...`);

    // 2. Dispatch start event
    this.dispatcher.dispatch(EventType.TOOL_EXECUTION_STARTED, {
      toolName: name,
      parameters: rawParams,
      toolDescription: tool?.description || `Executing ${name}`,
      chatId: executionCtxArgs.chatId,
      source: 'ToolRegistry',
      operationId,
      timestamp: startTime,
    });

    // 3. Validate and execute
    if (!tool) {
      const errorMsg = `Tool not found: ${name}`;
      const result: ToolResult<T> = { success: false, error: errorMsg, executionTime: Date.now() - startTime };
      this.dispatchCompletionEvent(name, rawParams, operationId, executionCtxArgs.chatId, result);
      return result;
    }

    const validationResult = ToolValidator.validate(tool.parametersSchema, rawParams);
    if (!validationResult.success) {
      const errorMsg = `Validation error: ${validationResult.error}`;
      const result: ToolResult<T> = { success: false, error: errorMsg, executionTime: Date.now() - startTime };
      this.dispatchCompletionEvent(name, rawParams, operationId, executionCtxArgs.chatId, result);
      return result;
    }

    const executionContext: ToolExecutionContext = {
      vscodeAPI: vscode,
      dispatcher: this.dispatcher,
      chatId: executionCtxArgs.chatId,
      ...executionCtxArgs
    };

    let result: ToolResult<T>;
    try {
      const toolExecuteOutcome = await tool.execute(validationResult.data, executionContext);
      result = { ...toolExecuteOutcome, executionTime: Date.now() - startTime };
    } catch (error: any) {
      const errorMsg = `Unexpected error executing tool ${name}: ${error.message}`;
      result = { success: false, error: errorMsg, executionTime: Date.now() - startTime };
    }

    // 4. Cache successful result
    if (result.success) {
      this.cacheManager.set(cacheKey, result);
    }

    // 5. Track performance and dispatch completion event
    this.performanceMonitor.trackNodeExecution(`tool.${name}`, result.executionTime || 0, result.error);
    this.dispatchCompletionEvent(name, rawParams, operationId, executionCtxArgs.chatId, result);

    return result;
  }

  private dispatchCompletionEvent(name: string, params: any, operationId: string, chatId: string | undefined, result: ToolResult<any>, fromCache = false): void {
    const eventType = result.success ? EventType.TOOL_EXECUTION_COMPLETED : EventType.TOOL_EXECUTION_ERROR;
    this.dispatcher.dispatch(eventType, {
      toolName: name,
      parameters: params,
      toolDescription: this.getTool(name)?.description || name,
      chatId,
      source: fromCache ? 'ToolRegistry.Cache' : 'ToolRegistry',
      operationId,
      timestamp: Date.now(),
      duration: result.executionTime,
      isProcessingStep: false,
      toolSuccess: result.success,
      error: result.error,
      rawOutput: result.data
    });
  }

  public asDynamicTool(toolName: string): DynamicStructuredTool | undefined {
    const toolDef = this.getTool(toolName);
    if (!toolDef) return undefined;

    const langChainFunc = async (input: any, runContext?: any) => {
      const toolResult = await this.executeTool(toolName, input, runContext?.config?.configurable);
      if (!toolResult.success) {
        // LangChain tools expect errors to be thrown to be handled correctly
        throw new Error(toolResult.error || `Unknown error in tool: ${toolName}`);
      }
      // Return a string representation of the result, as expected by many LangChain agents.
      return JSON.stringify(toolResult.data) || "Tool executed successfully with no output.";
    };
    return new DynamicStructuredTool({
      name: toolDef.name,
      description: toolDef.description,
      schema: toolDef.parametersSchema,
      func: langChainFunc,
    });
  }

  public asDynamicTools(): DynamicStructuredTool[] {
    return this.getAllTools()
      .map(toolDef => this.asDynamicTool(toolDef.name))
      .filter((tool): tool is DynamicStructuredTool => tool !== undefined);
  }

  public dispose(): void {
    this.tools.clear();
    console.log('[ToolRegistry] Disposed and all tools cleared.');
  }
}