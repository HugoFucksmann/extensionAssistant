// src/features/tools/ToolRegistry.ts
import { ToolDefinition, ToolResult, ToolExecutionContext, ParameterDefinition } from './types';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher'; // Ajusta la ruta
import * as vscode from 'vscode';
import { PermissionManager } from './PermissionManager';

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  constructor(private dispatcher: InternalEventDispatcher) {
    // El registro de herramientas se hará externamente ahora,
    // pasando los arrays de definiciones al método registerTools.
    this.log('info', 'ToolRegistry initialized. Ready to register tools.');
  }

  private log(level: 'info' | 'warning' | 'error', message: string, details?: Record<string, any>, errorObj?: Error) {
    if (!this.dispatcher) {
        console.log(`[ToolRegistry ${level} - No Dispatcher]: ${message}`, details || '', errorObj || '');
        return;
    }
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

  public registerTools(toolsToRegister: ToolDefinition[]): void {
    for (const tool of toolsToRegister) {
      if (this.tools.has(tool.name)) {
        this.log('warning', `Tool "${tool.name}" is already registered. Overwriting.`, { toolName: tool.name });
      }
      this.tools.set(tool.name, tool);
    }
    this.log('info', `Registered ${toolsToRegister.length} tools. Total tools: ${this.tools.size}.`, { registeredNow: toolsToRegister.map(t => t.name) });
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  async executeTool(
    name: string, 
    params: any, 
    // El contexto de ejecución ahora puede incluir más cosas, como chatId o uiOperationId
    // que el orquestador puede querer pasar.
    executionCtxArgs: { chatId?: string; uiOperationId?: string; [key: string]: any } = {} 
  ): Promise<ToolResult> {
    const logDetails = { toolName: name, params, executionCtxArgs };
    this.log('info', `Attempting to execute tool: ${name}`, logDetails);

    const tool = this.getTool(name);
    if (!tool) {
      this.log('warning', `Tool not found: ${name}`, logDetails);
      return { success: false, error: `Tool not found: ${name}` };
    }

    const executionContext: ToolExecutionContext = {
      vscodeAPI: vscode, // El módulo 'vscode' importado
      dispatcher: this.dispatcher,
      chatId: executionCtxArgs.chatId,
      ...executionCtxArgs // Pasar cualquier otro argumento del contexto
    };

    try {
      this.log('info', `Validating parameters for tool: ${name}`, logDetails);
      this.validateParameters(tool, params);

      if (tool.requiredPermissions && tool.requiredPermissions.length > 0) {
        this.log('info', `Checking permissions for tool: ${name}`, { ...logDetails, permissions: tool.requiredPermissions });
        const permissionGranted = await PermissionManager.checkPermissions(
          tool.name,
          tool.requiredPermissions,
          params, // Pasar params para el contexto del prompt de permisos
          executionContext // Pasar el contexto completo por si PermissionManager lo necesita
        );
        if (!permissionGranted) {
          const errorMsg = `Permission denied for tool ${name}. Required: ${tool.requiredPermissions.join(', ')}`;
          this.log('warning', errorMsg, logDetails);
          return { success: false, error: errorMsg };
        }
        this.log('info', `Permissions granted for tool: ${name}`, logDetails);
      }

      this.log('info', `Parameters validated. Executing tool: ${name}`, logDetails);
      const startTime = Date.now();
      const result = await tool.execute(params, executionContext);
      const executionTime = Date.now() - startTime;
      
      this.log('info', `Tool ${name} execution finished. Success: ${result.success}. Time: ${executionTime}ms`, { ...logDetails, resultSummary: result.success ? 'OK' : result.error?.substring(0,100) });
      return { ...result, executionTime };

    } catch (error: any) {
      this.log('error', `Error during execution of tool ${name}: ${error.message}`, logDetails, error);
      return { success: false, error: error.message, executionTime: 0 };
    }
  }

  private validateParameters(tool: ToolDefinition, params: any): void {
    const errors: string[] = [];
    
    for (const [paramName, def] of Object.entries(tool.parameters)) {
      if (def.required && (params == null || !(paramName in params) || params[paramName] === undefined)) {
        // Considerar undefined como no presente para parámetros requeridos
        if (params && paramName in params && params[paramName] === null && !def.nullable) { // Si es null pero no nullable
             errors.push(`Required parameter: ${paramName} cannot be null.`);
        } else if (!(params && paramName in params && params[paramName] !== undefined)) {
             errors.push(`Missing required parameter: ${paramName}`);
        }
      }
    }
    
    if (params != null) {
      for (const [paramName, value] of Object.entries(params)) {
        const def = tool.parameters[paramName];
        if (!def) {
          errors.push(`Unknown parameter: ${paramName}`);
          continue;
        }
        
        const error = this.validateParameterValue(paramName, value, def);
        if (error) errors.push(error);
      }
    }
    
    if (errors.length > 0) {
      const validationErrorMsg = `Validation failed for ${tool.name}: ${errors.join('; ')}`;
      throw new Error(validationErrorMsg);
    }
  }

  private validateParameterValue(name: string, value: any, def: ParameterDefinition): string | null {
    if (value === undefined && !def.required) return null;
    if (value === null && def.nullable) return null; // Si es nullable y es null, está bien
    if (value === null && !def.nullable && def.required) return `Parameter ${name} is required and cannot be null.`;
    if (value === null && !def.nullable && !def.required) return null; // Si no es requerido y es null, está bien

    if (value === undefined && def.required) return `Parameter ${name} is required but was undefined.`;


    const expectedType = def.type === 'any' ? typeof value : def.type;
    let actualType = Array.isArray(value) ? 'array' : typeof value;
    
    if (def.type === 'file') { // 'file' es un string (path)
        actualType = typeof value; 
    }

    if (expectedType !== actualType && def.type !== 'any') {
      // Permitir números para parámetros string si se pueden convertir (ej. enums numéricos como string)
      // Esto puede ser demasiado permisivo, evaluar si es necesario.
      // if (!(def.type === 'string' && typeof value === 'number')) {
        return `Parameter ${name} must be of type ${expectedType}, but got type ${actualType}.`;
      // }
    }
    
    if (def.enum && Array.isArray(def.enum) && !def.enum.includes(value)) {
      return `Parameter ${name} has value "${value}" which is not in the allowed enum list: [${def.enum.join(', ')}].`;
    }
    
    if ((def.type === 'string' || def.type === 'array') && value != null && value.length != null) {
      if (def.minLength != null && value.length < def.minLength) {
        return `Parameter ${name} must have at least ${def.minLength} items/characters, but has ${value.length}.`;
      }
      if (def.maxLength != null && value.length > def.maxLength) {
        return `Parameter ${name} must have at most ${def.maxLength} items/characters, but has ${value.length}.`;
      }
    }
    
    if (def.type === 'number' && typeof value === 'number') {
      if (def.minimum != null && value < def.minimum) {
        return `Parameter ${name} must be at least ${def.minimum}, but is ${value}.`;
      }
      if (def.maximum != null && value > def.maximum) {
        return `Parameter ${name} must be at most ${def.maximum}, but is ${value}.`;
      }
    }
    
    if (def.type === 'string' && def.pattern && typeof value === 'string') {
      if (!new RegExp(def.pattern).test(value)) {
        return `Parameter ${name} with value "${value}" does not match pattern: ${def.pattern}.`;
      }
    }

    if (def.type === 'array' && def.items && Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            const itemError = this.validateParameterValue(`${name}[${i}]`, value[i], def.items);
            if (itemError) return itemError;
        }
    }

    if (def.type === 'object' && def.properties && typeof value === 'object' && value !== null) {
        for (const propName in def.properties) {
            if (def.properties.hasOwnProperty(propName)) {
                const propDef = def.properties[propName];
                const propError = this.validateParameterValue(`${name}.${propName}`, value[propName], propDef);
                if (propError) return propError;
            }
        }
        // Opcional: verificar si hay propiedades extra no definidas en `def.properties`
        // if (!def.additionalProperties) { ... }
    }
    
    return null;
  }
}