
// src/features/tools/types.ts
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
}

export interface ToolDefinition<P = any, R = any> {
  name: string;
  description: string;
  parameters: Record<string, ParameterDefinition>;
  execute: (params: P, context?: any) => Promise<ToolResult<R>>;
}