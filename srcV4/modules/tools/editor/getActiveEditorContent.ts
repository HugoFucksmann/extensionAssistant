import * as vscode from 'vscode';
import { BaseTool } from '../baseTool';
import { ToolResult } from '../types';

/**
 * Interfaz para el resultado de obtener el contenido del editor
 */
interface EditorContentResult {
  content: string;
  languageId: string;
  filePath?: string;
  isDirty: boolean;
}

/**
 * Herramienta para obtener el contenido del editor activo
 */
export class GetActiveEditorContentTool extends BaseTool<{}, EditorContentResult> {
  static readonly NAME = 'getActiveEditorContent';
  
  readonly name = GetActiveEditorContentTool.NAME;
  readonly description = 'Obtiene el contenido del editor activo';
  
  // No requiere parámetros
  readonly parameters = {};
  
  async execute(): Promise<ToolResult<EditorContentResult>> {
    try {
      const editor = vscode.window.activeTextEditor;
      
      if (!editor) {
        return this.error('No hay ningún editor de texto activo');
      }
      
      const document = editor.document;
      const content = document.getText();
      const filePath = document.uri.fsPath;
      
      return this.success({
        content,
        languageId: document.languageId,
        filePath,
        isDirty: document.isDirty
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al obtener el contenido del editor';
      return this.error(errorMessage);
    }
  }
}

// Exportar una instancia de la herramienta
export const getActiveEditorContentTool = new GetActiveEditorContentTool();
