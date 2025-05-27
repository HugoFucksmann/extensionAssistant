// src/features/tools/definitions/editor/getActiveEditorInfo.ts
import * as vscode from 'vscode';
import { ToolDefinition, ToolPermission, ToolResult, ToolExecutionContext } from '../../types';

export const getActiveEditorInfo: ToolDefinition = {
  name: 'getActiveEditorInfo',
  description: 'Gets content, selection, file path, and language ID from the active text editor.',
  parameters: {}, // No parameters needed, operates on active editor
  requiredPermissions: ['editor.read'],
  async execute(_params: {}, context?: ToolExecutionContext): Promise<ToolResult> {
    if (!context?.vscodeAPI) {
      return { success: false, error: 'VSCode API context not available.' };
    }
    const editor = context.vscodeAPI.window.activeTextEditor;
    if (!editor) {
      return { success: false, error: 'No active text editor found.' };
    }

    const document = editor.document;
    const selection = editor.selection;

    try {
      return {
        success: true,
        data: {
          filePath: document.uri.fsPath,
          content: document.getText(),
          languageId: document.languageId,
          lineCount: document.lineCount,
          selection: {
            text: document.getText(selection),
            startLine: selection.start.line,
            startChar: selection.start.character,
            endLine: selection.end.line,
            endChar: selection.end.character,
            isEmpty: selection.isEmpty,
          },
        },
      };
    } catch (error: any) {
      // Usar el dispatcher para loguear el error si está disponible en el contexto
      context?.dispatcher?.systemError('Error executing getActiveEditorInfo', error, 
        { toolName: 'getActiveEditorInfo', params: _params, chatId: context.chatId }
      );
      return { success: false, error: `Failed to get active editor info: ${error.message}` };
    }
  }
};