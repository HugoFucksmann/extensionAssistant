// src/features/tools/definitions/editor/getActiveEditorInfo.ts
import { z } from 'zod';
import { ToolDefinition, ToolResult,  } from '../../types';

// Esquema Zod para los parámetros (vacío ya que no hay parámetros)
export const getActiveEditorInfoParamsSchema = z.object({}).strict();

// Tipo para la data retornada
type ActiveEditorInfo = {
  filePath: string | undefined; // Puede no haber un archivo asociado (ej. untitled)
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
  } | null; // La selección puede no existir si no hay editor
};

export const getActiveEditorInfo: ToolDefinition<typeof getActiveEditorInfoParamsSchema, ActiveEditorInfo | null> = {
  getUIDescription: () => 'Obtener información del editor activo.',
  uiFeedback: true,
  mapToOutput: (rawData, success, errorMsg) => success && rawData ? {
    title: 'Editor activo',
    summary: 'Información del editor obtenida correctamente.',
    details: `Archivo: ${rawData.filePath || 'Sin archivo'}\nLenguaje: ${rawData.languageId}\nSelección: ${rawData.selection ? rawData.selection.text : 'Sin selección'}`,
    items: [],
    meta: {
      filePath: rawData.filePath,
      languageId: rawData.languageId,
      lineCount: rawData.lineCount
    }
  } : {
    title: 'Error al obtener editor',
    summary: `Error: ${errorMsg || 'No se pudo obtener información del editor.'}`,
    details: errorMsg,
    items: [],
    meta: {}
  },
  name: 'getActiveEditorInfo',
  description: 'Gets information from the currently active text editor, including its content, file path (if any), language, and current selection. Returns null if no text editor is active.',
  parametersSchema: getActiveEditorInfoParamsSchema,
  async execute(
    _params, // No se usan parámetros
    context
  ): Promise<ToolResult<ActiveEditorInfo | null>> {
    const editor = context.vscodeAPI.window.activeTextEditor;
    if (!editor) {
      // Para feedback uniforme, poner warning en error y data en null
      return { success: false, error: 'No active text editor found.', data: null };
    }

    const document = editor.document;
    const selection = editor.selection;

    try {
      const data: ActiveEditorInfo = {
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