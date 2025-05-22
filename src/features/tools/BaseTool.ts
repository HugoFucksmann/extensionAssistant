// src/features/tools/BaseTool.ts
import { Tool, ToolResult, ParameterDefinition } from './types';

// Opción 1: Simplemente re-exportar la interfaz
export { Tool, ToolResult, ParameterDefinition };

// Opción 2: Clase abstracta (si tienes lógica común, como validación básica)
/*
export abstract class BaseTool<P = any, R = any> implements Tool<P, R> {
  abstract name: string;
  abstract description: string;
  abstract schema: {
    parameters: Record<string, ParameterDefinition>;
    returns: Record<string, any>;
  };

  abstract execute(params: P, context?: any): Promise<ToolResult<R>>;

  public validate(params: P): { isValid: boolean; errors?: string[] } {
    // Implementación de validación genérica basada en el schema
    // (Esto puede ser complejo de hacer genéricamente aquí,
    // ToolRegistry podría ser un mejor lugar para la validación centralizada)
    const errors: string[] = [];
    for (const paramName in this.schema.parameters) {
      const definition = this.schema.parameters[paramName];
      if (definition.required && (params as any)[paramName] === undefined) {
        errors.push(`Parameter '${paramName}' is required.`);
      }
      // Añadir más validaciones de tipo, enum, etc.
    }
    return { isValid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }
}
*/