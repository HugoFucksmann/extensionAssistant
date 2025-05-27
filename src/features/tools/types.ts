// src/features/tools/types.ts
import { InternalEventDispatcher } from '@core/events/InternalEventDispatcher';
import * as vscode from 'vscode';
import { z, ZodObject, ZodEffects, ZodTypeAny } from 'zod'; // <--- AÑADIDO Zod

// Tipo para esquemas Zod que pueden ser usados por las herramientas
// Permite un objeto Zod o un objeto Zod con efectos (transformaciones, refinamientos)
export type ZodSchemaType = ZodObject<any, any, any, any, any> | ZodEffects<ZodObject<any, any, any, any, any>, any, any> | ZodTypeAny;


/**
 * @deprecated ParameterDefinition ya no se usa. Utilizar esquemas Zod en ToolDefinition.parametersSchema.
 */
export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file' | 'any';
  description: string;
  required?: boolean;
  nullable?: boolean;
  default?: any;
  enum?: (string | number)[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  items?: ParameterDefinition;
  properties?: Record<string, ParameterDefinition>;
}

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime?: number;
  warnings?: string[];
  // status?: 'completed' | 'pendingUserInput' | ... // Podría ser útil para herramientas asíncronas complejas
}

// Definición de los tipos de permisos
export type ToolPermission =
  | 'filesystem.read'
  | 'filesystem.write'
  | 'workspace.info.read'
  | 'editor.read'
  | 'editor.write'
  | 'terminal.execute'
  | 'interaction.userInput';

// Contexto de ejecución para las herramientas
export interface ToolExecutionContext {
  vscodeAPI: typeof vscode;
  dispatcher: InternalEventDispatcher; // Ahora es obligatorio
  chatId?: string;
  uiOperationId?: string; // Para askUser y correlación de respuestas
  [key: string]: any; // Para flexibilidad
}

// Definición de Herramienta usando Zod para la validación de parámetros
export interface ToolDefinition<P_SCHEMA extends ZodSchemaType = ZodSchemaType, R = any> {
  name: string;
  description: string;
  parametersSchema: P_SCHEMA; // Esquema Zod para los parámetros
  execute: (params: z.infer<P_SCHEMA>, context: ToolExecutionContext) => Promise<ToolResult<R>>;
  requiredPermissions?: ToolPermission[];
}