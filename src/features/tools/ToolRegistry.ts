// src/features/tools/ToolRegistry.ts
import { ToolDefinition, ToolResult, ToolExecutionContext } from './types';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import * as vscode from 'vscode';
import { PermissionManager } from './PermissionManager';
import { ToolValidator, ValidationResult } from './ToolValidator';
import { EventType, ToolExecutionEventPayload } from '../../features/events/eventTypes'; // <-- MODIFICADO

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition<any, any>>();

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

  public registerTools(toolsToRegister: ToolDefinition<any, any>[]): void {
    for (const tool of toolsToRegister) {
      if (this.tools.has(tool.name)) {
        this.log('warning', `Tool "${tool.name}" is already registered. Overwriting.`, { toolName: tool.name });
      }
      this.tools.set(tool.name, tool);
    }
    this.log('info', `Registered ${toolsToRegister.length} tools. Total tools: ${this.tools.size}.`, { registeredNow: toolsToRegister.map(t => t.name) });
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

  private generateToolUIDescription(toolName: string, params: any, toolDefinition?: ToolDefinition<any,any>): string {
    if (!toolDefinition) return `Ejecutando ${toolName}`;

    // Intentar generar una descripción basada en el nombre y parámetros
    if (toolName === 'getFileContents' && params.path) {
      const fileName = typeof params.path === 'string' ? params.path.split(/[\\/]/).pop() : 'archivo';
      return `Leyendo archivo: ${fileName}`;
    } else if (toolName === 'searchInWorkspace' && params.query) {
      return `Buscando en el espacio de trabajo: "${params.query}"`;
    } else if (toolName === 'executeShellCommand' && params.command) {
      return `Ejecutando comando: ${params.command}`;
    } else if (toolName === 'writeToFile' && params.path) {
      const fileName = typeof params.path === 'string' ? params.path.split(/[\\/]/).pop() : 'archivo';
      return `Escribiendo archivo: ${fileName}`;
    } else if (toolName === 'createFileOrDirectory' && params.path) {
        const type = params.type || 'elemento';
        const name = typeof params.path === 'string' ? params.path.split(/[\\/]/).pop() : 'elemento';
        return `Creando ${type}: ${name}`;
    } else if (toolName === 'deletePath' && params.path) {
        const name = typeof params.path === 'string' ? params.path.split(/[\\/]/).pop() : 'elemento';
        return `Eliminando: ${name}`;
    } else if (toolName === 'applyEditorEdit' && params.filePath) {
        const fileName = typeof params.filePath === 'string' ? params.filePath.split(/[\\/]/).pop() : 'editor activo';
        return `Aplicando edición a: ${fileName}`;
    } else if (toolName === 'applyEditorEdit' && !params.filePath) {
        return `Aplicando edición al editor activo`;
    }
    // Descripción genérica basada en la descripción de la herramienta
    return toolDefinition.description || `Ejecutando ${toolName}`;
  }


  async executeTool(
    name: string,
    rawParams: any,
    executionCtxArgs: { chatId?: string; uiOperationId?: string; [key: string]: any } = {}
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const baseLogDetails = { toolName: name, rawParams, executionCtxArgs, chatId: executionCtxArgs.chatId };

    const tool = this.getTool(name);
    const toolDescriptionForUI = this.generateToolUIDescription(name, rawParams, tool);

    const dispatchToolEvent = (type: EventType, payload: Partial<ToolExecutionEventPayload>) => {
        this.dispatcher.dispatch(type, {
            toolName: name,
            parameters: payload.parameters || rawParams, // Usar rawParams si no se especifica
            toolDescription: toolDescriptionForUI,
            toolParams: payload.toolParams || rawParams, // Parámetros para mostrar en la UI
            chatId: executionCtxArgs.chatId,
            source: 'ToolRegistry',
            ...payload
        });
    };
    
    dispatchToolEvent(EventType.TOOL_EXECUTION_STARTED, {});
    this.log('info', `Attempting to execute tool: ${name}`, baseLogDetails);

    if (!tool) {
      const errorMsg = `Tool not found: ${name}`;
      this.log('warning', errorMsg, baseLogDetails);
      dispatchToolEvent(EventType.TOOL_EXECUTION_ERROR, {
        error: errorMsg,
        duration: Date.now() - startTime,
      });
      return { success: false, error: errorMsg, executionTime: Date.now() - startTime };
    }

    this.log('info', `Validating parameters for tool: ${name}`, baseLogDetails);
    const validationResult = ToolValidator.validate(tool.parametersSchema, rawParams);

    if (!validationResult.success) {
      this.log('warning', `Parameter validation failed for ${name}: ${validationResult.error}`, { ...baseLogDetails, issues: validationResult.issues });
      dispatchToolEvent(EventType.TOOL_EXECUTION_ERROR, {
        error: validationResult.error,
        duration: Date.now() - startTime,
        // toolParams: rawParams (ya se envían por defecto)
      });
      return { success: false, error: validationResult.error, executionTime: Date.now() - startTime };
    }
    const validatedParams = validationResult.data;
    const logDetailsWithValidatedParams = { ...baseLogDetails, validatedParams };

    const executionContext: ToolExecutionContext = {
      vscodeAPI: vscode,
      dispatcher: this.dispatcher,
      chatId: executionCtxArgs.chatId,
      uiOperationId: executionCtxArgs.uiOperationId,
      ...executionCtxArgs
    };

    if (tool.requiredPermissions && tool.requiredPermissions.length > 0) {
      this.log('info', `Checking permissions for tool: ${name}`, { ...logDetailsWithValidatedParams, permissions: tool.requiredPermissions });
      try {
        const permissionGranted = await PermissionManager.checkPermissions(
          tool.name,
          tool.requiredPermissions,
          validatedParams,
          executionContext
        );
        if (!permissionGranted) {
          const errorMsg = `Permission denied for tool ${name}. Required: ${tool.requiredPermissions.join(', ')}`;
          this.log('warning', errorMsg, logDetailsWithValidatedParams);
          dispatchToolEvent(EventType.TOOL_EXECUTION_ERROR, {
            parameters: validatedParams,
            toolParams: validatedParams,
            error: errorMsg,
            duration: Date.now() - startTime,
          });
          return { success: false, error: errorMsg, executionTime: Date.now() - startTime };
        }
        this.log('info', `Permissions granted for tool: ${name}`, logDetailsWithValidatedParams);
      } catch (permError: any) {
        const errorMsg = `Error during permission check for ${name}: ${permError.message}`;
        this.log('error', errorMsg, logDetailsWithValidatedParams, permError);
        dispatchToolEvent(EventType.TOOL_EXECUTION_ERROR, {
            parameters: validatedParams,
            toolParams: validatedParams,
            error: errorMsg,
            duration: Date.now() - startTime,
        });
        return { success: false, error: errorMsg, executionTime: Date.now() - startTime };
      }
    }

    try {
      this.log('info', `Executing tool: ${name}`, logDetailsWithValidatedParams);
      const toolResult = await tool.execute(validatedParams, executionContext);
      const executionTime = Date.now() - startTime;

      if (toolResult.success) {
        dispatchToolEvent(EventType.TOOL_EXECUTION_COMPLETED, {
            parameters: validatedParams,
            toolParams: validatedParams,
            result: toolResult.data,
            duration: executionTime,
        });
        this.log('info', `Tool ${name} execution successful. Time: ${executionTime}ms`, { ...logDetailsWithValidatedParams, resultData: toolResult.data });
      } else {
        dispatchToolEvent(EventType.TOOL_EXECUTION_ERROR, {
            parameters: validatedParams,
            toolParams: validatedParams,
            error: toolResult.error,
            duration: executionTime,
        });
        this.log('warning', `Tool ${name} execution failed: ${toolResult.error}. Time: ${executionTime}ms`, { ...logDetailsWithValidatedParams, error: toolResult.error });
      }
      return { ...toolResult, executionTime };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      const errorMsg = `Unexpected error during execution of tool ${name}: ${error.message}`;
      this.log('error', errorMsg, logDetailsWithValidatedParams, error);
      dispatchToolEvent(EventType.TOOL_EXECUTION_ERROR, {
        parameters: validatedParams,
        toolParams: validatedParams,
        error: errorMsg,
        duration: executionTime,
      });
      return { success: false, error: errorMsg, executionTime };
    }
  }
}