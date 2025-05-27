// src/features/tools/definitions/editor/getDocumentDiagnostics.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult, ToolExecutionContext, ToolPermission } from '../../types';
import { resolveWorkspacePath } from '../utils';

// Esquema Zod para los parámetros
export const getDocumentDiagnosticsParamsSchema = z.object({
  filePath: z.string().min(1).optional().describe("Optional workspace-relative path to the file. If omitted, uses the active editor.")
}).strict();

// Tipo para la data retornada
type DiagnosticInfo = {
  message: string;
  severity: string; // "Error", "Warning", "Information", "Hint"
  range: {
    startLine: number;
    startChar: number;
    endLine: number;
    endChar: number;
  };
  source?: string;
  code?: string | number;
};
type DiagnosticsResult = {
  documentPath: string; // Path relativo al workspace
  diagnostics: DiagnosticInfo[];
};

export const getDocumentDiagnostics: ToolDefinition<typeof getDocumentDiagnosticsParamsSchema, DiagnosticsResult> = {
  name: 'getDocumentDiagnostics',
  description: 'Gets diagnostic errors and warnings for the active editor or a specified file. If filePath is omitted, uses the active editor.',
  parametersSchema: getDocumentDiagnosticsParamsSchema,
  requiredPermissions: ['editor.read'], // O un permiso más específico como 'diagnostics.read'
  async execute(
    params, // Tipado por Zod
    context
  ): Promise<ToolResult<DiagnosticsResult>> {
    const { filePath } = params;
    let targetUri: vscode.Uri;
    let documentPathForReturn: string;

    try {
      if (filePath) {
        const resolvedUri = resolveWorkspacePath(context.vscodeAPI, filePath);
        if (!resolvedUri) {
          return { success: false, error: `Could not resolve path in workspace: "${filePath}". Ensure a workspace is open and the path is valid.` };
        }
        targetUri = resolvedUri;
        documentPathForReturn = context.vscodeAPI.workspace.asRelativePath(targetUri, false);
         // Asegurarse de que el documento esté "conocido" por VS Code para obtener diagnósticos
        await context.vscodeAPI.workspace.openTextDocument(targetUri);
      } else {
        const activeEditor = context.vscodeAPI.window.activeTextEditor;
        if (!activeEditor) {
          return { success: false, error: 'No active text editor and no filePath provided.' };
        }
        targetUri = activeEditor.document.uri;
        documentPathForReturn = activeEditor.document.isUntitled ? 
            `untitled:${activeEditor.document.fileName}` : 
            context.vscodeAPI.workspace.asRelativePath(targetUri, false);
      }

      const diagnostics = context.vscodeAPI.languages.getDiagnostics(targetUri);
      const formattedDiagnostics: DiagnosticInfo[] = diagnostics.map(d => ({
        message: d.message,
        severity: vscode.DiagnosticSeverity[d.severity],
        range: {
          startLine: d.range.start.line,
          startChar: d.range.start.character,
          endLine: d.range.end.line,
          endChar: d.range.end.character,
        },
        source: d.source,
        code: typeof d.code === 'object' ? String(d.code.value) : d.code ? String(d.code) : undefined,
      }));

      return { 
        success: true, 
        data: { 
          documentPath: documentPathForReturn, 
          diagnostics: formattedDiagnostics 
        } 
      };
    } catch (error: any) {
      return { success: false, error: `Failed to get document diagnostics: ${error.message}` };
    }
  }
};