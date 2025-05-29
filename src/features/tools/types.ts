// src/features/tools/types.ts
import { InternalEventDispatcher } from '@core/events/InternalEventDispatcher';
import * as vscode from 'vscode';
import { z, ZodObject, ZodEffects, ZodTypeAny } from 'zod';


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


export interface ToolDefinition<P_SCHEMA extends ZodSchemaType = ZodSchemaType, R = any> {
  /**
   * Indica si la herramienta debe generar feedback visual para la UI (ej: mensaje de chat, notificación, resultado visible).
   * Si es false, la herramienta solo ejecuta lógica interna o side-effects.
   */
  uiFeedback: boolean;
  name: string;
  description: string;
  parametersSchema: P_SCHEMA; 
  execute: (params: z.infer<P_SCHEMA>, context: ToolExecutionContext) => Promise<ToolResult<R>>;
}