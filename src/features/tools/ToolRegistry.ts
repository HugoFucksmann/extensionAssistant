// src/features/tools/ToolRegistry.ts
import { ToolDefinition, ToolResult, ToolExecutionContext } from './types';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import * as vscode from 'vscode';
import { PermissionManager } from './PermissionManager';
import { ToolValidator, ValidationResult } from './ToolValidator'; // <--- AÑADIDO
import { EventType } from '../../features/events/eventTypes'; // <--- AÑADIDO

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition<any, any>>(); // Especificar tipos genéricos

  constructor(private dispatcher: InternalEventDispatcher) {
    this.log('info', 'ToolRegistry initialized. Ready to register tools.');
  }

  private log(level: 'info' | 'warning' | 'error', message: string, details?: Record<string, any>, errorObj?: Error) {
    const source = 'ToolRegistry';
    switch (level) {
      case 'info':
        this.dispatcher.systemInfo(message, details, source);
        break;
      case 'warning':
        this.dispatcher.systemWarning(message, details, source);
        break;
      case 'error':
        this.dispatcher.systemError(message, errorObj, details, source);
        break;
    }
  }

  public registerTools(toolsToRegister: ToolDefinition<any, any>[]): void { // Especificar tipos genéricos
    for (const tool of toolsToRegister) {
      if (this.tools.has(tool.name)) {
        this.log('warning', `Tool "${tool.name}" is already registered. Overwriting.`, { toolName: tool.name });
      }
      this.tools.set(tool.name, tool);
    }
    this.log('info', `Registered ${toolsToRegister.length} tools. Total tools: ${this.tools.size}.`, { registeredNow: toolsToRegister.map(t => t.name) });
  }

  getTool(name: string): ToolDefinition<any, any> | undefined { // Especificar tipos genéricos
    return this.tools.get(name);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  getAllTools(): ToolDefinition<any, any>[] { // Especificar tipos genéricos
    return Array.from(this.tools.values());
  }

  async executeTool(
    name: string,
    rawParams: any, // Parámetros tal como vienen, antes de validar
    executionCtxArgs: { chatId?: string; uiOperationId?: string; [key: string]: any } = {}
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const baseLogDetails = { toolName: name, rawParams, executionCtxArgs, chatId: executionCtxArgs.chatId };

    this.dispatcher.dispatch(EventType.TOOL_EXECUTION_STARTED, {
      toolName: name,
      parameters: rawParams, // Enviar parámetros crudos
      chatId: executionCtxArgs.chatId,
      source: 'ToolRegistry'
    });
    this.log('info', `Attempting to execute tool: ${name}`, baseLogDetails);

    const tool = this.getTool(name);
    if (!tool) {
      const errorMsg = `Tool not found: ${name}`;
      this.log('warning', errorMsg, baseLogDetails);
      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_ERROR, {
        toolName: name,
        parameters: rawParams,
        error: errorMsg,
        duration: Date.now() - startTime,
        chatId: executionCtxArgs.chatId,
        source: 'ToolRegistry'
      });
      return { success: false, error: errorMsg, executionTime: Date.now() - startTime };
    }

    // 1. Validación de Parámetros usando Zod
    this.log('info', `Validating parameters for tool: ${name}`, baseLogDetails);
    const validationResult = ToolValidator.validate(tool.parametersSchema, rawParams);

    if (!validationResult.success) {
      this.log('warning', `Parameter validation failed for ${name}: ${validationResult.error}`, { ...baseLogDetails, issues: validationResult.issues });
      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_ERROR, {
        toolName: name,
        parameters: rawParams,
        error: validationResult.error,
        duration: Date.now() - startTime,
        chatId: executionCtxArgs.chatId,
        source: 'ToolRegistry'
      });
      return { success: false, error: validationResult.error, executionTime: Date.now() - startTime };
    }
    const validatedParams = validationResult.data;
    const logDetailsWithValidatedParams = { ...baseLogDetails, validatedParams };
    this.log('info', `Parameters validated for tool: ${name}`, logDetailsWithValidatedParams);


    // 2. Construir Contexto de Ejecución Completo
    const executionContext: ToolExecutionContext = {
      vscodeAPI: vscode,
      dispatcher: this.dispatcher,
      chatId: executionCtxArgs.chatId,
      uiOperationId: executionCtxArgs.uiOperationId,
      ...executionCtxArgs // Pasar cualquier otro argumento del contexto
    };

    // 3. Comprobación de Permisos
    if (tool.requiredPermissions && tool.requiredPermissions.length > 0) {
      this.log('info', `Checking permissions for tool: ${name}`, { ...logDetailsWithValidatedParams, permissions: tool.requiredPermissions });
      try {
        const permissionGranted = await PermissionManager.checkPermissions(
          tool.name,
          tool.requiredPermissions,
          validatedParams, // Pasar parámetros validados para el contexto del prompt
          executionContext // Pasar el contexto completo
        );
        if (!permissionGranted) {
          const errorMsg = `Permission denied for tool ${name}. Required: ${tool.requiredPermissions.join(', ')}`;
          this.log('warning', errorMsg, logDetailsWithValidatedParams);
          this.dispatcher.dispatch(EventType.TOOL_EXECUTION_ERROR, {
            toolName: name,
            parameters: validatedParams,
            error: errorMsg,
            duration: Date.now() - startTime,
            chatId: executionCtxArgs.chatId,
            source: 'ToolRegistry'
          });
          return { success: false, error: errorMsg, executionTime: Date.now() - startTime };
        }
        this.log('info', `Permissions granted for tool: ${name}`, logDetailsWithValidatedParams);
      } catch (permError: any) {
        const errorMsg = `Error during permission check for ${name}: ${permError.message}`;
        this.log('error', errorMsg, logDetailsWithValidatedParams, permError);
        this.dispatcher.dispatch(EventType.TOOL_EXECUTION_ERROR, {
            toolName: name,
            parameters: validatedParams,
            error: errorMsg,
            duration: Date.now() - startTime,
            chatId: executionCtxArgs.chatId,
            source: 'ToolRegistry'
          });
        return { success: false, error: errorMsg, executionTime: Date.now() - startTime };
      }
    }

    // 4. Ejecución de la Herramienta
    try {
      this.log('info', `Executing tool: ${name}`, logDetailsWithValidatedParams);
      const toolResult = await tool.execute(validatedParams, executionContext);
      const executionTime = Date.now() - startTime;

      if (toolResult.success) {
        this.dispatcher.dispatch(EventType.TOOL_EXECUTION_COMPLETED, {
          toolName: name,
          parameters: validatedParams,
          result: toolResult.data, // Solo el 'data' del resultado
          duration: executionTime,
          chatId: executionCtxArgs.chatId,
          source: 'ToolRegistry'
        });
        this.log('info', `Tool ${name} execution successful. Time: ${executionTime}ms`, { ...logDetailsWithValidatedParams, resultData: toolResult.data });
      } else {
        this.dispatcher.dispatch(EventType.TOOL_EXECUTION_ERROR, {
          toolName: name,
          parameters: validatedParams,
          error: toolResult.error,
          duration: executionTime,
          chatId: executionCtxArgs.chatId,
          source: 'ToolRegistry'
        });
        this.log('warning', `Tool ${name} execution failed: ${toolResult.error}. Time: ${executionTime}ms`, { ...logDetailsWithValidatedParams, error: toolResult.error });
      }
      return { ...toolResult, executionTime };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      const errorMsg = `Unexpected error during execution of tool ${name}: ${error.message}`;
      this.log('error', errorMsg, logDetailsWithValidatedParams, error);
      this.dispatcher.dispatch(EventType.TOOL_EXECUTION_ERROR, {
        toolName: name,
        parameters: validatedParams, // validatedParams debería estar definido aquí
        error: errorMsg,
        duration: executionTime,
        chatId: executionCtxArgs.chatId,
        source: 'ToolRegistry'
      });
      return { success: false, error: errorMsg, executionTime };
    }
  }

  // Los métodos validateParameters y validateParameterValue se eliminan
  // ya que Zod y ToolValidator se encargan de la validación.
}