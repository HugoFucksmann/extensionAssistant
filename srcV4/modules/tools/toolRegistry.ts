import { Tool, ToolResult } from './types';

/**
 * Registro centralizado de herramientas disponibles en el sistema
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * Registra una nueva herramienta en el registro
   * @param tool Herramienta a registrar
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Ya existe una herramienta con el nombre '${tool.name}'`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Obtiene una herramienta por su nombre
   * @param name Nombre de la herramienta
   * @returns La herramienta o undefined si no existe
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Obtiene todas las herramientas registradas
   * @returns Array con todas las herramientas
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Obtiene los nombres de todas las herramientas registradas
   * @returns Array con los nombres de todas las herramientas
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Verifica si una herramienta existe en el registro
   * @param name Nombre de la herramienta a verificar
   * @returns true si la herramienta existe, false en caso contrario
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Elimina una herramienta del registro
   * @param name Nombre de la herramienta a eliminar
   * @returns true si la herramienta fue eliminada, false si no existía
   */
  removeTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Ejecuta una herramienta con los parámetros proporcionados
   * @param name Nombre de la herramienta a ejecutar
   * @param params Parámetros para la herramienta
   * @returns Resultado de la ejecución
   */
  async executeTool<T = any, R = any>(name: string, params: T): Promise<ToolResult<R>> {
    const tool = this.getTool(name);
    if (!tool) {
      return {
        success: false,
        error: `No se encontró la herramienta '${name}'`,
        code: 'TOOL_NOT_FOUND',
      };
    }

    try {
      const result = await tool.execute(params);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return {
        success: false,
        error: `Error al ejecutar la herramienta '${name}': ${errorMessage}`,
        code: 'TOOL_EXECUTION_ERROR',
      };
    }
  }
}

/**
 * Instancia global del registro de herramientas
 */
export const toolRegistry = new ToolRegistry();

// Exporta los tipos para facilitar la importación
export * from './types';
