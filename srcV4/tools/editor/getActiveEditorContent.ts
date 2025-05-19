import * as vscode from 'vscode';
import { ToolResult } from '../types';

/**
 * Información del editor activo
 */
export interface EditorInfo {
  content: string;
  fileName: string;
  languageId: string;
  lineCount: number;
  selection?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
    text: string;
  };
}

/**
 * Herramienta para obtener el contenido del editor activo
 * @returns Resultado con la información del editor activo
 */
export async function getActiveEditorContent(): Promise<ToolResult<EditorInfo>> {
  try {
    const editor = vscode.window.activeTextEditor;
    
    if (!editor) {
      throw new Error('No active text editor found');
    }
    
    const document = editor.document;
    const content = document.getText();
    const selection = editor.selection;
    const selectedText = document.getText(selection);
    
    const editorInfo: EditorInfo = {
      content,
      fileName: document.fileName,
      languageId: document.languageId,
      lineCount: document.lineCount
    };
    
    // Incluir información de selección si hay texto seleccionado
    if (!selection.isEmpty) {
      editorInfo.selection = {
        start: {
          line: selection.start.line,
          character: selection.start.character
        },
        end: {
          line: selection.end.line,
          character: selection.end.character
        },
        text: selectedText
      };
    }
    
    return {
      success: true,
      data: editorInfo
    };
  } catch (error: any) {
    console.error(`[getActiveEditorContent] Error:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
