import * as vscode from 'vscode';
import { ToolResult, EditorParams } from '../../types';

/**
 * Herramienta para aplicar ediciones de texto al editor activo
 * @param params Parámetros de la herramienta
 * @param context Contexto opcional (no utilizado en esta implementación)
 * @returns Resultado de la operación
 */
export async function applyTextEdit(
  params: EditorParams,
  context?: any
): Promise<ToolResult<{ success: boolean }>> {
  try {
    // Handle both old and new parameter structures
    const edits = 'edits' in params ? params.edits : params.edits;
    const documentUri = 'documentUri' in params ? params.documentUri : undefined;
    
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
    
    // Define the edit object type with both possible structures
    type TextEdit = {
      range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
      };
      newText?: string;
      text?: string;
    };

    // Convertir las ediciones al formato de VS Code
    const vscodeEdits = (edits as TextEdit[]).map(edit => {
      const range = new vscode.Range(
        new vscode.Position(edit.range.start.line, edit.range.start.character),
        new vscode.Position(edit.range.end.line, edit.range.end.character)
      );
      // Handle both old (newText) and new (text) property names
      const text = 'newText' in edit ? edit.newText : edit.text;
      if (typeof text !== 'string') {
        throw new Error('Invalid edit: missing text or newText property');
      }
      return vscode.TextEdit.replace(range, text);
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
