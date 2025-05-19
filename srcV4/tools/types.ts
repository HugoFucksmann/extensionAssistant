/**
 * Tipos básicos para las herramientas de Windsurf
 */

/**
 * Resultado genérico de una herramienta
 */
export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Definición de una herramienta
 */
export interface Tool<P = any, R = any> {
  name: string;
  description: string;
  execute: (params: P) => Promise<ToolResult<R>>;
  schema: {
    parameters: Record<string, any>;
    returns: Record<string, any>;
  };
}
