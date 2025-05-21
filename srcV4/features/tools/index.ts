/**
 * Módulo de herramientas para Windsurf
 * 
 * Este módulo exporta todas las herramientas disponibles en el sistema,
 * organizadas por categorías.
 */

// Tipos y utilidades
export * from './types';
export * from './baseTool';

// Módulos de herramientas
export * from './filesystem';
export * from './editor';
export * from './project';

// Colección de todas las herramientas disponibles
import { readFileTool, writeToFileTool, listFilesTool } from './filesystem';
import { getActiveEditorContentTool, applyTextEditTool } from './editor';
import { searchWorkspaceTool, getProjectInfoTool } from './project';

/**
 * Todas las herramientas disponibles en el sistema
 */
export const allTools = [
  // Herramientas del sistema de archivos
  readFileTool,
  writeToFileTool,
  listFilesTool,
  
  // Herramientas del editor
  getActiveEditorContentTool,
  applyTextEditTool,
  
  // Herramientas de proyecto
  searchWorkspaceTool,
  getProjectInfoTool,
];

/**
 * Registra todas las herramientas en un registro de herramientas
 * @param toolRegistry Instancia del registro de herramientas
 */
export function registerAllTools(toolRegistry: any): void {
  for (const tool of allTools) {
    try {
      toolRegistry.register(tool);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`Error al registrar la herramienta ${tool.name}:`, errorMessage);
    }
  }
}

/**
 * Obtiene una herramienta por su nombre
 * @param name Nombre de la herramienta a buscar
 * @returns La herramienta encontrada o undefined si no existe
 */
export function getToolByName(name: string): any | undefined {
  return allTools.find(tool => tool.name === name);
}

/**
 * Obtiene múltiples herramientas por sus nombres
 * @param names Nombres de las herramientas a buscar
 * @returns Array con las herramientas encontradas
 */
export function getToolsByNames(names: string[]): any[] {
  return allTools.filter(tool => names.includes(tool.name));
}
