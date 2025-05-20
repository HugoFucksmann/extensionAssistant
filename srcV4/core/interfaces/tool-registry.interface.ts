/**
 * Interfaz para el registro de herramientas de la arquitectura Windsurf
 * Define el contrato que debe implementar cualquier registro de herramientas
 */

import { Tool, ToolResult } from '../../tools/types';

export interface IToolRegistry {
  /**
   * Registra una nueva herramienta
   * @param tool Herramienta a registrar
   */
  registerTool(tool: Tool): void;

  /**
   * Obtiene una herramienta por su nombre
   * @param name Nombre de la herramienta
   * @returns La herramienta o undefined si no existe
   */
  getTool(name: string): Tool | undefined;

  /**
   * Obtiene todas las herramientas disponibles
   * @returns Lista de todas las herramientas
   */
  getAllTools(): Tool[];

  /**
   * Ejecuta una herramienta con los parámetros especificados
   * @param name Nombre de la herramienta
   * @param params Parámetros para la herramienta
   * @returns Resultado de la ejecución
   */
  executeTool(name: string, params: Record<string, any>): Promise<ToolResult>;

  /**
   * Verifica si una herramienta existe
   * @param name Nombre de la herramienta
   * @returns true si la herramienta existe, false en caso contrario
   */
  hasTool(name: string): boolean;

  /**
   * Elimina una herramienta del registro
   * @param name Nombre de la herramienta a eliminar
   * @returns true si la herramienta fue eliminada, false si no existía
   */
  removeTool(name: string): boolean;
}
