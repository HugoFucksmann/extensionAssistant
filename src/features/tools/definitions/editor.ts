// src/features/tools/definitions/editor.ts
// import * as vscode from 'vscode'; // NO MÁS IMPORT GLOBAL SIEMPRE QUE SEA POSIBLE
import { ToolDefinition, ToolExecutionContext } from '../types'; // ToolExecutionContext ya importa vscode

export const getActiveEditorContent: ToolDefinition = {
  name: 'getActiveEditorContent',
  description: 'Gets content from the active editor',
  parameters: {},
  requiredPermissions: ['editor.read'], // AÑADIDO requiredPermissions
  async execute(params: {}, context?: ToolExecutionContext) { // params añadido aunque vacío, y context
    if (!context?.vscodeAPI) { // COMPROBACIÓN CLAVE
      return { success: false, error: 'VSCode API context not available for getActiveEditorContent.' };
    }
    const vscodeInstance = context.vscodeAPI;

    try {
      const editor = vscodeInstance.window.activeTextEditor;
      if (!editor) {
        // Devolver un ToolResult en lugar de lanzar error directamente
        return { success: false, error: 'No active editor found' };
      }

      const document = editor.document;
      const selection = editor.selection;

      return {
        success: true,
        data: {
          content: document.getText(),
          fileName: document.fileName,
          languageId: document.languageId,
          lineCount: document.lineCount,
          selection: {
            start: { line: selection.start.line, character: selection.start.character },
            end: { line: selection.end.line, character: selection.end.character },
            text: document.getText(selection)
          }
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export const applyTextEdit: ToolDefinition = {
  name: 'applyTextEdit',
  description: 'Applies text edits to a document',
  parameters: { /*...*/ },
  requiredPermissions: ['editor.write'], // AÑADIDO requiredPermissions
  async execute(params: { edits: any[]; documentUri?: string }, context?: ToolExecutionContext) {
    if (!context?.vscodeAPI) { // COMPROBACIÓN CLAVE
      return { success: false, error: 'VSCode API context not available for applyTextEdit.' };
    }
    const vscodeInstance = context.vscodeAPI;

    try {
      const { edits, documentUri } = params;

      let document: import('vscode').TextDocument;
      if (documentUri) {
        document = await vscodeInstance.workspace.openTextDocument(vscodeInstance.Uri.parse(documentUri));
      } else {
        const editor = vscodeInstance.window.activeTextEditor;
        if (!editor) {
          return { success: false, error: 'No active editor and no document URI provided' };
        }
        document = editor.document;
      }

      const workspaceEdit = new vscodeInstance.WorkspaceEdit();

      for (const edit of edits) {
        const range = new vscodeInstance.Range(
          edit.range.start.line,
          edit.range.start.character,
          edit.range.end.line,
          edit.range.end.character
        );
        workspaceEdit.replace(document.uri, range, edit.text);
      }

      const success = await vscodeInstance.workspace.applyEdit(workspaceEdit);

      return {
        success,
        data: { success } // El resultado de applyEdit es un booleano
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};