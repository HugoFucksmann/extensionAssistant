// src/features/tools/definitions/editor.ts
import * as vscode from 'vscode';
import { ToolDefinition } from '../types';

export const getActiveEditorContent: ToolDefinition = {
  name: 'getActiveEditorContent',
  description: 'Gets content from the active editor',
  parameters: {},
  async execute() {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        throw new Error('No active editor found');
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
  parameters: {
    edits: {
      type: 'array',
      description: 'Array of text edits to apply',
      required: true,
      items: {
        type: 'object',
        description: 'Text edit definition', // Añade esta línea
        properties: {
          range: {
            type: 'object',
            description: 'Range to edit',
            required: true
          },
          text: {
            type: 'string',
            description: 'New text', 
            required: true
          }
        }
      }
    },
    documentUri: {
      type: 'string',
      description: 'URI of document to edit',
      required: false
    }
  },
  async execute(params: { edits: any[]; documentUri?: string }) {
    try {
      const { edits, documentUri } = params;
      
      let document: vscode.TextDocument;
      if (documentUri) {
        document = await vscode.workspace.openTextDocument(vscode.Uri.parse(documentUri));
      } else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          throw new Error('No active editor and no document URI provided');
        }
        document = editor.document;
      }
      
      const workspaceEdit = new vscode.WorkspaceEdit();
      
      for (const edit of edits) {
        const range = new vscode.Range(
          edit.range.start.line,
          edit.range.start.character,
          edit.range.end.line,
          edit.range.end.character
        );
        workspaceEdit.replace(document.uri, range, edit.text);
      }
      
      const success = await vscode.workspace.applyEdit(workspaceEdit);
      
      return {
        success,
        data: { success }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};