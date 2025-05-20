/**
 * Tipos básicos para las herramientas de Windsurf
 * Importados desde core/types.ts para mantener una definición centralizada
 */

import { Tool, ToolResult, ParameterDefinition } from '../core/types';

// Re-exportar los tipos para mantener compatibilidad con código existente
export { Tool, ToolResult, ParameterDefinition };

// Tipos adicionales específicos para herramientas

/**
 * Tipo para los parámetros de las herramientas de sistema de archivos
 */
export interface FileSystemParams {
  filePath: string;
  relativeTo?: 'workspace' | 'absolute';
  content?: string;
  createIfNotExists?: boolean;
}

/**
 * Tipo para los parámetros de las herramientas de editor
 */
export interface EditorParams {
  documentUri?: string;
  edits?: Array<{
    range: { start: { line: number, character: number }, end: { line: number, character: number } };
    text: string;
  }>;
}
