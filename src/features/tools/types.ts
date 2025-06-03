// src/features/tools/types.ts
import { InternalEventDispatcher } from '@core/events/InternalEventDispatcher';
import * as vscode from 'vscode';
import { z, ZodObject, ZodEffects, ZodTypeAny } from 'zod';


export interface ToolOutput {
  title?: string;
  summary?: string;
  details?: string;
  items?: Array<any>;
  meta?: Record<string, any>;
}


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


export type ZodSchemaType = ZodObject<any, any, any, any, any> | ZodEffects<ZodObject<any, any, any, any, any>, any, any> | ZodTypeAny;

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  mappedOutput?: ToolOutput;
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

  getUIDescription?: (params: any) => string;
  uiFeedback: boolean;
  name: string;
  description: string;
  parametersSchema: ParamsSchema;
  execute: (params: z.infer<ParamsSchema>, context: ToolExecutionContext) => Promise<ToolResult<ResultData>>;

  mapToOutput?: (rawData: any, success: boolean, errorMsg?: string) => ToolOutput;
}