import * as vscode from 'vscode';
import { ToolResult } from '../types';

/**
 * Tipo de edición de texto
 */
export interface TextEdit {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  newText: string;
}

/**
 * Herramienta para aplicar ediciones de texto al editor activo
 * @param params Parámetros de la herramienta
 * @returns Resultado de la operación
 */
export async function applyTextEdit(params: {
  edits: TextEdit[];
  documentUri?: string;
}): Promise<ToolResult<{ success: boolean }>> {
  try {
    const { edits, documentUri } = params;
    
    if (!edits || !Array.isArray(edits) || edits.length === 0) {
      throw new Error('No edits provided');
    }
    
    let document: vscode.TextDocument;
    
    // Si se proporciona un URI, abrir ese documento
    if (documentUri) {
      const uri = vscode.Uri.parse(documentUri);
      document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
    } else {
      // Usar el editor activo
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        throw new Error('No active text editor found');
      }
      document = editor.document;
    }
    
    // Convertir las ediciones al formato de VS Code
    const vscodeEdits = edits.map(edit => {
      const range = new vscode.Range(
        new vscode.Position(edit.range.start.line, edit.range.start.character),
        new vscode.Position(edit.range.end.line, edit.range.end.character)
      );
      return new vscode.TextEdit(range, edit.newText);
    });
    
    // Aplicar las ediciones
    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.set(document.uri, vscodeEdits);
    
    const editResult = await vscode.workspace.applyEdit(workspaceEdit);
    
    return {
      success: true,
      data: { success: editResult }
    };
  } catch (error: any) {
    console.error(`[applyTextEdit] Error:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
