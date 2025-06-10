// src/features/tools/types.ts
import { InternalEventDispatcher } from 'src/core/events/InternalEventDispatcher';
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

  name: string;


  description: string;


  parametersSchema: ParamsSchema;


  uiFeedback?: boolean;


  execute: (
    params: z.infer<ParamsSchema>,
    context: ToolExecutionContext
  ) => Promise<ToolResult<ResultData>>;


  getUIDescription?: (params: any) => string;
}