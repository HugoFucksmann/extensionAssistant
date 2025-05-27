// src/features/tools/definitions/editor/getDocumentDiagnostics.ts
import * as vscode from 'vscode';
import { ToolDefinition, ToolPermission, ToolResult, ToolExecutionContext } from '../../types';

export const getDocumentDiagnostics: ToolDefinition = {
  name: 'getDocumentDiagnostics',
  description: 'Gets diagnostic errors and warnings for the active editor or a specified file. If filePath is omitted, uses the active editor.',
  parameters: {
    filePath: { type: 'string', description: 'Optional workspace-relative path to the file. If omitted, uses the active editor.', required: false }
  },
  requiredPermissions: ['editor.read'], // O un permiso más específico como 'diagnostics.read'
  async execute(
    params: { filePath?: string },
    context?: ToolExecutionContext
  ): Promise<ToolResult> {
    if (!context?.vscodeAPI) {
      return { success: false, error: 'VSCode API context not available.' };
    }
    const { filePath } = params;
    let targetUri: vscode.Uri;

    try {
      if (filePath) {
        const workspaceFolders = context.vscodeAPI.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          return { success: false, error: 'No workspace folder open to resolve relative file path.' };
        }
        targetUri = vscode.Uri.joinPath(workspaceFolders[0].uri, filePath);
      } else {
        const activeEditor = context.vscodeAPI.window.activeTextEditor;
        if (!activeEditor) {
          return { success: false, error: 'No active text editor and no filePath provided.' };
        }
        targetUri = activeEditor.document.uri;
      }

      // Asegurarse de que el documento esté abierto para que los diagnósticos estén actualizados
      // aunque getDiagnostics(uri) debería funcionar para cualquier URI, los proveedores pueden
      // activarse al abrir el documento.
      await context.vscodeAPI.workspace.openTextDocument(targetUri);

      const diagnostics = context.vscodeAPI.languages.getDiagnostics(targetUri);
      const formattedDiagnostics = diagnostics.map(d => ({
        message: d.message,
        severity: vscode.DiagnosticSeverity[d.severity], // Convierte enum a string: "Error", "Warning", etc.
        range: { 
          startLine: d.range.start.line, 
          startChar: d.range.start.character,
          endLine: d.range.end.line,
          endChar: d.range.end.character,
        },
        source: d.source,
        code: typeof d.code === 'object' ? d.code.value : d.code, // Maneja DiagnosticCode
      }));

      return { success: true, data: { documentUri: targetUri.toString(), diagnostics: formattedDiagnostics } };
    } catch (error: any) {
      context?.dispatcher?.systemError('Error executing getDocumentDiagnostics', error, 
        { toolName: 'getDocumentDiagnostics', params, chatId: context.chatId }
      );
      return { success: false, error: `Failed to get document diagnostics: ${error.message}` };
    }
  }
};