// src/features/tools/types.ts
import { InternalEventDispatcher } from '@core/events/InternalEventDispatcher';
import * as vscode from 'vscode';
import { z, ZodObject, ZodEffects, ZodTypeAny } from 'zod';

export interface ToolExecution<T = any> {
  name: string;
  status: 'started' | 'completed' | 'error' | 'permission_denied';
  parameters?: Record<string, any>;
  result?: T;
  error?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
}

export type ZodSchemaType = ZodObject<any, any, any, any, any> | ZodEffects<ZodObject<any, any, any, any, any>, any, any> | ZodTypeAny;

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime?: number;
  warnings?: string[];
}

export interface ToolExecutionContext {
  vscodeAPI: typeof vscode;
  dispatcher: InternalEventDispatcher;
  chatId?: string;
  [key: string]: any;
}

export interface ToolDefinition<
  ParamsSchema extends z.ZodType<any, any, any>,
  ResultData = any
> {
  /** Nombre único de la herramienta */
  name: string;

  /** Descripción de la herramienta */
  description: string;

  /** Esquema de validación de parámetros */
  parametersSchema: ParamsSchema;

  /** Si es true, mostrará un indicador de carga en la UI */
  uiFeedback?: boolean;

  /** Función que ejecuta la lógica de la herramienta */
  execute: (
    params: z.infer<ParamsSchema>,
    context: ToolExecutionContext
  ) => Promise<ToolResult<ResultData>>;

  /** Descripción para la UI (opcional) */
  getUIDescription?: (params: any) => string;
}