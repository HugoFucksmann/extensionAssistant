/**
 * Tipos centrales para la arquitectura Windsurf
 * Define las interfaces y tipos principales utilizados en todo el sistema
 */

import * as vscode from 'vscode';

/**
 * Herramienta que puede ser ejecutada por el agente
 */
export interface WindsurfTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

/**
 * Definición de una herramienta con esquema detallado
 */
export interface Tool<P = any, R = any> {
  name: string;
  description: string;
  execute: (params: P) => Promise<ToolResult<R>>;
  schema: {
    parameters: Record<string, ParameterDefinition>;
    returns: Record<string, any>;
  };
}

/**
 * Definición de un parámetro para una herramienta
 */
export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;
  
  // Validación para valores enuméricos
  enum?: any[];
  
  // Validación para números
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  multipleOf?: number;
  
  // Validación para strings
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string; // email, date-time, uri, etc.
  
  // Validación para arrays
  items?: ParameterDefinition | ParameterDefinition[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  
  // Validación para objetos
  properties?: Record<string, ParameterDefinition>;
  additionalProperties?: boolean | ParameterDefinition;
  requiredProperties?: string[];
}

/**
 * Resultado genérico de una herramienta
 */
export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Contexto de la extensión VS Code
 */
export interface VSCodeContext {
  extensionUri: vscode.Uri;
  extensionPath: string;
  subscriptions: vscode.Disposable[];
  outputChannel: vscode.OutputChannel;
}
