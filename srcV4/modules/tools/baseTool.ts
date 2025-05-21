import { Tool, ToolResult, ParameterDefinition } from './types';

/**
 * Clase base abstracta para todas las herramientas
 * Proporciona funcionalidad común y asegura la implementación de métodos requeridos
 */
export abstract class BaseTool<T = any, R = any> implements Tool<T, ToolResult<R>> {
  /** Nombre único de la herramienta */
  abstract readonly name: string;
  
  /** Descripción de lo que hace la herramienta */
  abstract readonly description: string;
  
  /** Parámetros que acepta la herramienta */
  abstract readonly parameters?: Record<string, ParameterDefinition>;
  
  /**
   * Ejecuta la herramienta con los parámetros proporcionados
   * @param params Parámetros para la herramienta
   * @returns Resultado de la ejecución
   */
  abstract execute(params: T): Promise<ToolResult<R>> | ToolResult<R>;
  
  /**
   * Valida los parámetros de entrada
   * @param params Parámetros a validar
   * @throws Error si la validación falla
   */
  protected validateParams(params: T): void {
    if (!params && Object.keys(this.parameters || {}).length > 0) {
      throw new Error('Se requieren parámetros para esta herramienta');
    }
    
    // Validar parámetros requeridos
    if (this.parameters) {
      for (const [paramName, paramDef] of Object.entries(this.parameters)) {
        if (paramDef.required && params[paramName as keyof T] === undefined) {
          throw new Error(`El parámetro '${paramName}' es requerido`);
        }
      }
    }
  }
  
  /**
   * Crea un resultado exitoso
   */
  protected success(data: R): ToolResult<R> {
    return { success: true, data };
  }
  
  /**
   * Crea un resultado de error
   */
  protected error(message: string, code?: string | number): ToolResult<R> {
    return { success: false, error: message, code };
  }
}
