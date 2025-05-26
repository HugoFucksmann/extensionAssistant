// src/features/tools/ToolRegistry.ts
import { ToolDefinition, ToolResult, ToolExecutionContext, ToolPermission, ParameterDefinition } from './types'; // Asegúrate que ParameterDefinition esté aquí
import * as filesystem from './definitions/filesystem';
import * as editor from './definitions/editor';
import * as workspaceTools from './definitions/workspace'; // Renombrado para evitar conflicto con 'vscode.workspace'
import * as core from './definitions/core';
// Esqueletos para nuevas herramientas (se implementarán después)
// import * as filesystemExtended from './definitions/filesystemExtended';
// import * as terminal from './definitions/terminal';
// import * as diagnostics from './definitions/diagnostics';
// import * as git from './definitions/git';
// import * as interaction from './definitions/interaction';

import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import { EventType } from '../../features/events/eventTypes';
import * as vscode from 'vscode'; // Necesario para construir el ToolExecutionContext
import { PermissionManager } from './PermissionManager';

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  constructor(private dispatcher: InternalEventDispatcher) { // Inyectar dispatcher
    this.registerTools([
      filesystem.getFileContents,
      filesystem.writeToFile,
      filesystem.listFiles,
      editor.getActiveEditorContent,
      editor.applyTextEdit,
      workspaceTools.getProjectInfo, // Usar el alias
      workspaceTools.searchWorkspace, // Usar el alias
      core.respond,
      // Aquí se añadirán las nuevas herramientas
    ]);
    this.log('info', 'ToolRegistry initialized.', { registeredTools: this.getToolNames() });
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

  private registerTools(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
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

  // executeTool ahora construye y pasa el ToolExecutionContext
  async executeTool(name: string, params: any, chatId?: string): Promise<ToolResult> {
    const logDetails = { toolName: name, params, chatId };
    this.log('info', `Attempting to execute tool: ${name}`, logDetails);

    const tool = this.getTool(name);
    if (!tool) {
      this.log('warning', `Tool not found: ${name}`, logDetails);
      return { success: false, error: `Tool not found: ${name}` };
    }

    // Construir el ToolExecutionContext
    // Esto asume que 'vscode' es el módulo global de VS Code.
    // Si tienes un VSCodeContext más estructurado en ComponentFactory, podrías usarlo.
    const executionContext: ToolExecutionContext = {
      vscodeAPI: vscode, // El módulo 'vscode' importado
      chatId: chatId,
      dispatcher: this.dispatcher,
      // dispatcher: this.dispatcher, // Si las herramientas necesitan emitir eventos
      // outputChannel: vscode.window.createOutputChannel("Tool Output") // O una compartida
    };

    try {
      this.log('info', `Validating parameters for tool: ${name}`, logDetails);
      this.validateParameters(tool, params);

      // >>> INICIO DE VERIFICACIÓN DE PERMISOS <<<
      if (tool.requiredPermissions && tool.requiredPermissions.length > 0) {
        this.log('info', `Checking permissions for tool: ${name}`, { ...logDetails, permissions: tool.requiredPermissions });
        const permissionGranted = await PermissionManager.checkPermissions(
          tool.name,
          tool.requiredPermissions,
          params
        );
        if (!permissionGranted) {
          const errorMsg = `Permission denied by user or configuration for tool ${name}. Required: ${tool.requiredPermissions.join(', ')}`;
          this.log('warning', errorMsg, logDetails);
          return { success: false, error: errorMsg };
        }
        this.log('info', `Permissions granted for tool: ${name}`, logDetails);
      }
      // >>> FIN DE VERIFICACIÓN DE PERMISOS <<<

      this.log('info', `Parameters validated. Executing tool: ${name}`, logDetails);
      return await tool.execute(params, executionContext); // Pasar el contexto

    } catch (error: any) {
      // Si validateParameters lanza un error, se captura aquí.
      // Si tool.execute lanza un error, también se captura aquí.
      this.log('error', `Error during execution of tool ${name}: ${error.message}`, logDetails, error);
      return { success: false, error: error.message };
    }
  }

  // validateParameters y validateParameterValue (sin cambios respecto a tu versión, pero incluidos por completitud)
  private validateParameters(tool: ToolDefinition, params: any): void {
    const errors: string[] = [];
    
    for (const [paramName, def] of Object.entries(tool.parameters)) {
      if (def.required && (params == null || !(paramName in params))) {
        errors.push(`Missing required parameter: ${paramName}`);
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
      const validationErrorMsg = `Validation failed for ${tool.name}: ${errors.join(', ')}`;
      throw new Error(validationErrorMsg);
    }
  }

  private validateParameterValue(name: string, value: any, def: ParameterDefinition): string | null {
    if (value == null && !def.required) return null; 
    if (value == null && def.required) return `Parameter ${name} is required but was null/undefined`;

    const expectedType = def.type === 'any' ? typeof value : def.type;
    let actualType = Array.isArray(value) ? 'array' : typeof value;
    
    if (def.type === 'file') {
        actualType = typeof value; 
    }

    if (expectedType !== actualType && def.type !== 'any') {
      return `Parameter ${name} must be ${expectedType}, got ${actualType}`;
    }
    
    if (def.enum && !(def.enum as unknown[]).includes(value)) {
      return `Parameter ${name} must be one of: ${def.enum.join(', ')}`;
    }
    
    if ((def.type === 'string' || def.type === 'array') && value != null && value.length != null) {
      if (def.minLength != null && value.length < def.minLength) {
        return `Parameter ${name} must have at least ${def.minLength} items/characters`;
      }
      if (def.maxLength != null && value.length > def.maxLength) {
        return `Parameter ${name} must have at most ${def.maxLength} items/characters`;
      }
    }
    
    if (def.type === 'number' && value != null) { // Check value is not null for numeric comparisons
      if (def.minimum != null && value < def.minimum) {
        return `Parameter ${name} must be at least ${def.minimum}`;
      }
      if (def.maximum != null && value > def.maximum) {
        return `Parameter ${name} must be at most ${def.maximum}`;
      }
    }
    
    if (def.type === 'string' && def.pattern && value != null) { // Check value is not null for regex test
      if (!new RegExp(def.pattern).test(value)) {
        return `Parameter ${name} does not match pattern: ${def.pattern}`;
      }
    }
    
    return null;
  }
}