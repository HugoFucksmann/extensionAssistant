// src/features/tools/types.ts
import { InternalEventDispatcher } from '@core/events/InternalEventDispatcher';
import * as vscode from 'vscode';
// Importar InternalEventDispatcher si se va a incluir en ToolExecutionContext
// import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';

export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file' | 'any';
  description: string;
  required?: boolean;
  default?: any;
  enum?: string[] | number[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string; // e.g., 'uri', 'email'
  items?: ParameterDefinition; // For type 'array'
  properties?: Record<string, ParameterDefinition>; // For type 'object'
}

export interface ToolExecutionContext {
  vscodeAPI: typeof vscode;
  dispatcher?: InternalEventDispatcher; // AÑADIR dispatcher como opcional
  chatId?: string;
}

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime?: number; // Opcional, podría ser calculado por el llamador
  warnings?: string[];
  // Podríamos añadir una bandera si la herramienta requiere una acción de seguimiento por parte del agente
  // requiresFollowUp?: boolean; // Para herramientas como askUserForInput
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

// Contexto de ejecución opcional para las herramientas
export interface ToolExecutionContext {
  vscodeAPI: typeof vscode; // Acceso a la API de VS Code
  // dispatcher?: InternalEventDispatcher; // Si la herramienta necesita emitir eventos directamente
  // outputChannel?: vscode.OutputChannel; // Para logging específico de la herramienta
  chatId?: string; // Para contextualizar acciones o logs de la herramienta
  // Podrías añadir más cosas aquí según sea necesario, como configuraciones globales
}

export interface ToolDefinition<P = any, R = any> {
  name: string;
  description: string;
  parameters: Record<string, ParameterDefinition>;
  // execute ahora puede aceptar un contexto opcional
  execute: (params: P, context?: ToolExecutionContext) => Promise<ToolResult<R>>;
  // Añadir la propiedad para los permisos requeridos
  requiredPermissions?: ToolPermission[];
}