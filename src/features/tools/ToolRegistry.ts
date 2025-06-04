// src/features/tools/ToolRegistry.ts
import { ToolDefinition, ToolResult, ToolExecutionContext } from './types';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import * as vscode from 'vscode';
import { ToolValidator } from './ToolValidator';
import { generateUniqueId } from '../../shared/utils/generateIds';
import { EventType, ToolExecutionEventPayload } from '../../features/events/eventTypes';
import { DynamicStructuredTool } from '@langchain/core/tools';

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition<any, any>>();

  constructor(private dispatcher: InternalEventDispatcher) {

  }

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

    // Obtener la descripción para UI desde la herramienta
    const toolDescriptionForUI = tool && typeof tool.getUIDescription === 'function'
      ? tool.getUIDescription(rawParams)
      : tool?.description || `Ejecutando ${name}`;

    const startPayload: ToolExecutionEventPayload = {
      toolName: name,
      parameters: rawParams,
      toolDescription: toolDescriptionForUI,
      chatId: executionCtxArgs.chatId,
      source: 'ToolRegistry',
      operationId,
      timestamp: Date.now(),
      duration: 0, // Valor inicial
      isProcessingStep: false, // Valor inicial
      toolSuccess: false // Valor inicial (se actualizará luego según el resultado)
    };

    this.dispatcher.dispatch(EventType.TOOL_EXECUTION_STARTED, startPayload);

    if (!tool) {
      const errorMsg = `Herramienta no encontrada: ${name}`;
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: errorMsg,
        executionTime,
      };
    }


    const validationResult = ToolValidator.validate(tool.parametersSchema, rawParams);
    if (!validationResult.success) {
      const executionTime = Date.now() - startTime;
      const errorMsg = `Error de validación: ${validationResult.error}`;

      return {
        success: false,
        error: errorMsg,
        executionTime,
      };
    }
    const validatedParams = validationResult.data;

    const executionContext: ToolExecutionContext = {
      vscodeAPI: vscode,
      dispatcher: this.dispatcher,
      chatId: executionCtxArgs.chatId,
      ...executionCtxArgs
    };

    try {
      const toolExecuteOutcome = await tool.execute(validatedParams, executionContext);
      const executionTime = Date.now() - startTime;

      return {
        ...toolExecuteOutcome,
        executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      const errorMsg = `Error inesperado al ejecutar la herramienta ${name}: ${error.message}`;

      return {
        success: false,
        error: errorMsg,
        executionTime,
      };
    }
  }

  public asDynamicTool(toolName: string, contextDefaults: Record<string, any> = {}): DynamicStructuredTool | undefined {
    const toolDef = this.getTool(toolName);
    if (!toolDef) return undefined;

    const langChainFunc = async (input: any, runContext?: any) => {
      const toolResult = await this.executeTool(toolName, input, runContext);
      if (!toolResult.success) {
        throw new Error(toolResult.error || 'Error desconocido');
      }
      // Devolver los datos directamente, la UI se encargará del formateo
      return JSON.stringify(toolResult.data) || "Success";
    };
    return new DynamicStructuredTool({
      name: toolDef.name,
      description: toolDef.description,
      schema: toolDef.parametersSchema,
      func: langChainFunc,
    });
  }

  public asDynamicTools(contextDefaults: Record<string, any> = {}): DynamicStructuredTool[] {
    return this.getAllTools()
      .map(toolDef => this.asDynamicTool(toolDef.name, contextDefaults))
      .filter(tool => tool !== undefined) as DynamicStructuredTool[];
  }
}