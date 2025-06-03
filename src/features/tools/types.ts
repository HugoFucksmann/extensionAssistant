// src/features/tools/types.ts
import { InternalEventDispatcher } from '@core/events/InternalEventDispatcher';
import * as vscode from 'vscode';
import { z, ZodObject, ZodEffects, ZodTypeAny } from 'zod';

// ========== ToolOutput: Moved from shared/types.ts ==========
export interface ToolOutput {
  /**
   * Título breve para la UI (ej: "Archivo guardado", "Resultados de búsqueda").
   */
  title?: string;
  /**
   * Resumen corto o mensaje principal para mostrar (tipo toast o feedback).
   */
  summary?: string;
  /**
   * Detalles extendidos, logs, o explicación larga (puede ser markdown).
   */
  details?: string;
  /**
   * Lista de resultados, archivos, errores, etc. (array genérico para tablas/listas).
   */
  items?: Array<any>;
  /**
   * Metadatos adicionales (ej: counts, status, flags, paths, info extra).
   */
  meta?: Record<string, any>;
}

// ========== ToolExecution ==========
export interface ToolExecution {
  name: string;
  status: 'started' | 'completed' | 'error' | 'permission_denied';
  parameters?: Record<string, any>;
  result?: ToolOutput;
  error?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
}

// ========== Existing types in src/features/tools/types.ts ==========
export type ZodSchemaType = ZodObject<any, any, any, any, any> | ZodEffects<ZodObject<any, any, any, any, any>, any, any> | ZodTypeAny;

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  mappedOutput?: ToolOutput; // Now directly uses the ToolOutput defined above
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
  /**
   * Devuelve una descripción amigable para la UI, usando los parámetros recibidos.
   * Si no se define, se usará description.
   */
  getUIDescription?: (params: any) => string;
  uiFeedback: boolean;
  name: string;
  description: string;
  parametersSchema: ParamsSchema;
  execute: (params: z.infer<ParamsSchema>, context: ToolExecutionContext) => Promise<ToolResult<ResultData>>;
  /**
   * Función opcional para mapear la salida cruda de la herramienta a ToolOutput.
   * Si no se define, ToolRegistry usará el mapeador genérico por defecto.
   */
  mapToOutput?: (rawData: any, success: boolean, errorMsg?: string) => ToolOutput;
}