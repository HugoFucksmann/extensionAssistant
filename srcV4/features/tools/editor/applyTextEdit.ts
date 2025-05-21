import * as vscode from 'vscode';
import { BaseTool } from '../baseTool';
import { ToolResult } from '../types';

/**
 * Interfaz para los parámetros de edición de texto
 */
interface TextEditParams {
  /**
   * URI del documento a editar (opcional, usa el documento activo si no se especifica)
   */
  documentUri?: string;
  
  /**
   * Ediciones a aplicar
   */
  edits: Array<{
    /**
     * Rango de texto a reemplazar
     */
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
    
    /**
     * Nuevo contenido de texto
     */
    text: string;
  }>;
  
  /**
   * Si se debe mostrar un mensaje de confirmación antes de aplicar los cambios
   * @default false
   */
  showConfirmation?: boolean;
  
  /**
   * Mensaje de confirmación a mostrar (solo si showConfirmation es true)
   */
  confirmationMessage?: string;
}

/**
 * Herramienta para aplicar ediciones de texto a un documento
 */
export class ApplyTextEditTool extends BaseTool<TextEditParams, void> {
  static readonly NAME = 'applyTextEdit';
  
  readonly name = ApplyTextEditTool.NAME;
  readonly description = 'Aplica ediciones de texto a un documento';
  
  readonly parameters = {
    documentUri: {
      type: 'string',
      description: 'URI del documento a editar (opcional, usa el documento activo si no se especifica)'
    },
    edits: {
      type: 'array',
      description: 'Array de ediciones a aplicar',
      items: {
        type: 'object',
        properties: {
          range: {
            type: 'object',
            properties: {
              start: {
                type: 'object',
                properties: {
                  line: { type: 'number' },
                  character: { type: 'number' }
                },
                required: ['line', 'character']
              },
              end: {
                type: 'object',
                properties: {
                  line: { type: 'number' },
                  character: { type: 'number' }
                },
                required: ['line', 'character']
              }
            },
            required: ['start', 'end']
          },
          text: { type: 'string' }
        },
        required: ['range', 'text']
      },
      required: true
    },
    showConfirmation: {
      type: 'boolean',
      description: 'Si se debe mostrar un mensaje de confirmación antes de aplicar los cambios',
      default: false
    },
    confirmationMessage: {
      type: 'string',
      description: 'Mensaje de confirmación a mostrar (solo si showConfirmation es true)'
    }
  };
  
  async execute(params: TextEditParams): Promise<ToolResult<void>> {
    try {
      this.validateParams(params);
      
      const { documentUri, edits, showConfirmation = false, confirmationMessage } = params;
      
      // Mostrar confirmación si es necesario
      if (showConfirmation) {
        const message = confirmationMessage || '¿Estás seguro de que deseas aplicar estos cambios?';
        const selection = await vscode.window.showInformationMessage(
          message,
          { modal: true },
          'Aplicar',
          'Cancelar'
        );
        
        if (selection !== 'Aplicar') {
          return this.success(undefined);
        }
      }
      
      let textEditor: vscode.TextEditor;
      
      if (documentUri) {
        // Abrir el documento especificado
        const uri = vscode.Uri.parse(documentUri);
        const document = await vscode.workspace.openTextDocument(uri);
        textEditor = await vscode.window.showTextDocument(document);
      } else {
        // Usar el editor activo
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return this.error('No hay ningún editor de texto activo');
        }
        textEditor = editor;
      }
      
      // Convertir las ediciones al formato de VS Code
      const workspaceEdits = new vscode.WorkspaceEdit();
      
      for (const edit of edits) {
        const { range, text } = edit;
        const vsRange = new vscode.Range(
          new vscode.Position(range.start.line, range.start.character),
          new vscode.Position(range.end.line, range.end.character)
        );
        
        workspaceEdits.replace(textEditor.document.uri, vsRange, text);
      }
      
      // Aplicar los cambios
      const success = await vscode.workspace.applyEdit(workspaceEdits);
      
      if (!success) {
        return this.error('No se pudieron aplicar los cambios');
      }
      
      // Guardar el documento si es necesario
      if (textEditor.document.isDirty) {
        await textEditor.document.save();
      }
      
      return this.success(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al aplicar los cambios de texto';
      return this.error(errorMessage);
    }
  }
}

// Exportar una instancia de la herramienta
export const applyTextEditTool = new ApplyTextEditTool();
