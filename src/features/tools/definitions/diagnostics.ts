import * as vscode from 'vscode';
import { ToolDefinition, ToolResult, ToolExecutionContext, ToolPermission } from '../types';

export const getActiveEditorDiagnostics: ToolDefinition = {
  name: 'getActiveEditorDiagnostics',
  description: 'Gets diagnostics (errors, warnings) for the active text editor or a specified file URI.',
  parameters: {
    documentUri: { type: 'string', description: 'Optional URI of the document to get diagnostics for. If not provided, uses active editor.', required: false },
  },
  requiredPermissions: ['editor.read'], // O un 'diagnostics.read'
  async execute(params: { documentUri?: string }, context?: ToolExecutionContext): Promise<ToolResult> {
    if (!context?.vscodeAPI) return { success: false, error: 'VSCode API context not available.' };
    
    let targetUri: vscode.Uri | undefined;

    if (params.documentUri) {
      targetUri = context.vscodeAPI.Uri.parse(params.documentUri);
    } else {
      const activeEditor = context.vscodeAPI.window.activeTextEditor;
      if (!activeEditor) {
        return { success: false, error: 'No active text editor and no documentUri provided.' };
      }
      targetUri = activeEditor.document.uri;
    }

    if (!targetUri) return { success: false, error: 'Could not determine target document URI.'};

    try {
      // ANTES DE EJECUTAR: Verificar permisos
      const diagnostics = context.vscodeAPI.languages.getDiagnostics(targetUri);
      const formattedDiagnostics = diagnostics.map(d => ({
        message: d.message,
        severity: vscode.DiagnosticSeverity[d.severity], // "Error", "Warning", "Information", "Hint"
        range: { 
          startLine: d.range.start.line, 
          startChar: d.range.start.character,
          endLine: d.range.end.line,
          endChar: d.range.end.character,
        },
        source: d.source,
        code: typeof d.code === 'object' ? d.code.value : d.code,
      }));
      return { success: true, data: { documentUri: targetUri.toString(), diagnostics: formattedDiagnostics } };
    } catch (error: any) {
      return { success: false, error: `Failed to get diagnostics for ${targetUri.toString()}: ${error.message}` };
    }
  }
};