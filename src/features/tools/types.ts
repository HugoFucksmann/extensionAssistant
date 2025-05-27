// src/features/tools/types.ts
import { InternalEventDispatcher } from '@core/events/InternalEventDispatcher';
import * as vscode from 'vscode';

export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file' | 'any';
  description: string;
  required?: boolean;
  nullable?: boolean; // <-- AÑADIDO: Indica si el valor null es permitido
  default?: any;
  enum?: (string | number)[]; // <-- CORREGIDO: enum puede ser de strings o números
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string; 
  items?: ParameterDefinition; 
  properties?: Record<string, ParameterDefinition>; 
  // additionalProperties?: boolean | ParameterDefinition; // Para validación de objetos
}

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime?: number; 
  warnings?: string[];
  // e.g. for askUser, to indicate the agent should wait for a follow-up event
  // status?: 'completed' | 'pendingUserInput' | ... 
}

// Definición de los tipos de permisos
export type ToolPermission = 
  | 'filesystem.read'
  | 'filesystem.write' // Implica crear, escribir, borrar
  | 'workspace.info.read'
  | 'editor.read'
  | 'editor.write'
  | 'terminal.execute'
  | 'interaction.userInput';

// Contexto de ejecución para las herramientas
export interface ToolExecutionContext {
  vscodeAPI: typeof vscode;
  dispatcher: InternalEventDispatcher; // Hacerlo no opcional si siempre se pasa
  chatId?: string;
  uiOperationId?: string; // Para askUser
  [key: string]: any; // Para flexibilidad
}

export interface ToolDefinition<P = any, R = any> {
  name: string;
  description: string;
  parameters: Record<string, ParameterDefinition>;
  execute: (params: P, context?: ToolExecutionContext) => Promise<ToolResult<R>>;
  requiredPermissions?: ToolPermission[];
}