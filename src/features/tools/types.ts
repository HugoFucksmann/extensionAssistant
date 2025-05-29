// src/features/tools/types.ts
import { InternalEventDispatcher } from '@core/events/InternalEventDispatcher';
import * as vscode from 'vscode';
import { z, ZodObject, ZodEffects, ZodTypeAny } from 'zod'; // <--- AÑADIDO Zod


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
  name: string;
  description: string;
  parametersSchema: P_SCHEMA; 
  execute: (params: z.infer<P_SCHEMA>, context: ToolExecutionContext) => Promise<ToolResult<R>>;
}