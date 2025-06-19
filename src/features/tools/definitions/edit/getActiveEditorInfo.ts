// src/features/tools/definitions/editor/getActiveEditorInfo.ts
import { z } from 'zod';
import { ToolDefinition, ToolResult } from '../../types';

export const getActiveEditorInfoParamsSchema = z.object({}).strict();

export type ActiveEditorInfoData = {
  filePath: string | undefined;
  content: string;
  languageId: string;
  lineCount: number;
  selection: {
    text: string;
    startLine: number;
    startChar: number;
    endLine: number;
    endChar: number;
    isEmpty: boolean;
  } | null;
};

export const getActiveEditorInfo: ToolDefinition<typeof getActiveEditorInfoParamsSchema, ActiveEditorInfoData | null> = {
  name: 'getActiveEditorInfo',
  description: 'Gets information from the currently active text editor, including its content, file path (if any), language, and current selection. Returns null if no text editor is active.',
  parametersSchema: getActiveEditorInfoParamsSchema,
  uiFeedback: true,
  getUIDescription: () => 'Obtener info del editor activo',

  async execute(_params, context): Promise<ToolResult<ActiveEditorInfoData | null>> {
    const editor = context.vscodeAPI.window.activeTextEditor;
    if (!editor) {
      return {
        success: true,
        data: null,
        warnings: ['No active text editor found.']
      };
    }

    const document = editor.document;
    const selection = editor.selection;

    try {
      const data: ActiveEditorInfoData = {
        filePath: document.isUntitled ? undefined : context.vscodeAPI.workspace.asRelativePath(document.uri, false),
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
      };
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: `Failed to get active editor info: ${error.message}` };
    }
  }
};