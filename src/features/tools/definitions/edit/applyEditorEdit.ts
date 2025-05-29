// src/features/tools/definitions/editor/applyEditorEdit.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult,  } from '../../types';
import { resolveWorkspacePath } from '../utils';

// Esquema Zod para los parámetros
export const applyEditorEditParamsSchema = z.object({
  newContent: z.string().describe("The new, full text content for the document."),
  filePath: z.string().min(1).optional().describe("Optional workspace-relative path to the file. If omitted, applies to the active editor.")
}).strict();

type ApplyEditResult = {
  filePath: string; // Path relativo al workspace
  applied: boolean;
  saved: boolean;
};

export const applyEditorEdit: ToolDefinition<typeof applyEditorEditParamsSchema, ApplyEditResult> = {
  name: 'applyEditorEdit',
  description: 'Replaces the entire content of the active editor or a specified file with new text. If filePath is omitted, applies to the active editor. The document is saved after the edit.',
  parametersSchema: applyEditorEditParamsSchema,
  async execute(
    params, // Tipado por Zod
    context
  ): Promise<ToolResult<ApplyEditResult>> {
    const { newContent, filePath } = params;
    let documentUri: vscode.Uri;
    let document: vscode.TextDocument;

    try {
      if (filePath) {
        const resolvedUri = resolveWorkspacePath(context.vscodeAPI, filePath);
        if (!resolvedUri) {
          return { success: false, error: `Could not resolve path in workspace: "${filePath}". Ensure a workspace is open and the path is valid.` };
        }
        documentUri = resolvedUri;
        try {
            document = await context.vscodeAPI.workspace.openTextDocument(documentUri);
        } catch (e: any) {
            return { success: false, error: `Failed to open document at "${filePath}": ${e.message}. The file might not exist or is not accessible.` };
        }
      } else {
        const activeEditor = context.vscodeAPI.window.activeTextEditor;
        if (!activeEditor) {
          return { success: false, error: 'No active editor and no filePath provided. Cannot apply edit.' };
        }
        document = activeEditor.document;
        documentUri = document.uri;
      }

      const edit = new context.vscodeAPI.WorkspaceEdit();
      const fullRange = new context.vscodeAPI.Range(
        document.lineAt(0).range.start,
        document.lineAt(document.lineCount - 1).range.end
      );
      
      edit.replace(documentUri, fullRange, newContent);
      
      const success = await context.vscodeAPI.workspace.applyEdit(edit);

      if (success) {
        // Guardar el documento después de la edición
        // No es necesario reabrirlo, 'document' ya es la referencia correcta.
        await document.save();
        return { 
          success: true, 
          data: { 
            filePath: context.vscodeAPI.workspace.asRelativePath(documentUri, false), 
            applied: true, 
            saved: true 
          } 
        };
      } else {
        return { success: false, error: 'Failed to apply edit to document. The operation was not successful.' };
      }
    } catch (error: any) {
      return { success: false, error: `Failed to apply editor edit: ${error.message}` };
    }
  }
};