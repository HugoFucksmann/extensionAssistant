/**
 * Módulo de herramientas para Windsurf
 * 
 * Este módulo exporta todas las herramientas disponibles en el sistema,
 * organizadas por categorías.
 */

// Tipos y utilidades
export * from './types';
export * from './baseTool';
export * from './toolRegistry';
export * from './toolRegistryAdapter';

// Módulos de herramientas
export * from './filesystem';
export * from './editor';
export * from './project';

// Importaciones de herramientas
import { readFileTool, writeToFileTool, listFilesTool } from './filesystem';
import { getActiveEditorContentTool, applyTextEditTool } from './editor';
import { searchWorkspaceTool, getProjectInfoTool } from './project';
import { Tool } from './types';

// Colección de todas las herramientas disponibles
const allTools: Tool[] = [
  // Herramientas del sistema de archivos
  readFileTool as unknown as Tool,
  writeToFileTool as unknown as Tool,
  listFilesTool as unknown as Tool,
  
  // Herramientas del editor
  getActiveEditorContentTool as unknown as Tool,
  applyTextEditTool as unknown as Tool,
  
  // Herramientas de proyecto
  searchWorkspaceTool as unknown as Tool,
  getProjectInfoTool as unknown as Tool,
];

/**
 * Registra todas las herramientas en un registro de herramientas
 * @param toolRegistry Instancia del registro de herramientas
 */
export function registerAllTools(toolRegistry: { register: (tool: any) => void }): void {
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
export function getToolByName(name: string): Tool | undefined {
  return allTools.find(tool => tool.name === name);
}

/**
 * Obtiene múltiples herramientas por sus nombres
 * @param names Nombres de las herramientas a buscar
 * @returns Array con las herramientas encontradas
 */
export function getToolsByNames(names: string[]): Tool[] {
  return allTools.filter(tool => names.includes(tool.name));
}
