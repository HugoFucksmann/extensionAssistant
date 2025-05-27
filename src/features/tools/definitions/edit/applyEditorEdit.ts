// src/features/tools/definitions/editor/applyEditorEdit.ts
import * as vscode from 'vscode';
import { ToolDefinition, ToolPermission, ToolResult, ToolExecutionContext } from '../../types';

export const applyEditorEdit: ToolDefinition = {
  name: 'applyEditorEdit',
  description: 'Replaces the entire content of the active editor or a specified file with new text. If filePath is omitted, applies to the active editor.',
  parameters: {
    newContent: { type: 'string', description: 'The new, full text content for the document.', required: true },
    filePath: { type: 'string', description: 'Optional workspace-relative path to the file. If omitted, uses the active editor.', required: false }
  },
  requiredPermissions: ['editor.write'],
  async execute(
    params: { newContent: string; filePath?: string },
    context?: ToolExecutionContext
  ): Promise<ToolResult> {
    if (!context?.vscodeAPI) {
      return { success: false, error: 'VSCode API context not available.' };
    }

    const { newContent, filePath } = params;
    let documentUri: vscode.Uri;

    try {
      if (filePath) {
        const workspaceFolders = context.vscodeAPI.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          return { success: false, error: 'No workspace folder open to resolve relative file path.' };
        }
        // Asumimos que filePath es relativo al primer workspace folder
        documentUri = vscode.Uri.joinPath(workspaceFolders[0].uri, filePath);
      } else {
        const activeEditor = context.vscodeAPI.window.activeTextEditor;
        if (!activeEditor) {
          return { success: false, error: 'No active editor and no filePath provided.' };
        }
        documentUri = activeEditor.document.uri;
      }

      const document = await context.vscodeAPI.workspace.openTextDocument(documentUri);
      const edit = new context.vscodeAPI.WorkspaceEdit();
      
      // Crear un rango que cubra todo el documento
      const firstLine = document.lineAt(0);
      const lastLine = document.lineAt(document.lineCount - 1);
      const fullRange = new context.vscodeAPI.Range(
        firstLine.range.start, // start of the first line
        lastLine.range.end    // end of the last line
      );
      
      edit.replace(documentUri, fullRange, newContent);
      
      const success = await context.vscodeAPI.workspace.applyEdit(edit);

      if (success) {
        // Opcionalmente, guardar el documento después de la edición
        const docToSave = await context.vscodeAPI.workspace.openTextDocument(documentUri);
        await docToSave.save();
        return { success: true, data: { filePath: documentUri.fsPath, applied: true, saved: true } };
      } else {
        return { success: false, error: 'Failed to apply edit to document.' };
      }
    } catch (error: any) {
      context?.dispatcher?.systemError('Error executing applyEditorEdit', error, 
        { toolName: 'applyEditorEdit', params, chatId: context.chatId }
      );
      return { success: false, error: `Failed to apply editor edit: ${error.message}` };
    }
  }
};