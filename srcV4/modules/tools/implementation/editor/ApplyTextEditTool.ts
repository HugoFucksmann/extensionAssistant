
// src/modules/tools/implementation/editor/ApplyTextEditTool.ts
import { ToolRunner } from "../../core/ToolRunner";
import { LangChainTool } from "../../core/CustomToolTypes";

// Definición de tipos para los parámetros
interface TextRange {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

interface TextEdit {
  range: TextRange;
  text: string;
}

interface ApplyTextEditParams {
  documentUri: string;
  edits: TextEdit[];
}

/**
 * Tool para aplicar ediciones de texto a un documento
 */
export const applyTextEditTool = new LangChainTool({
  name: "applyTextEdit",
  description: "Aplica ediciones de texto a un documento abierto en el editor",
  schema: {
    type: "object",
    properties: {
      documentUri: {
        type: "string",
        description: "URI del documento a editar"
      },
      edits: {
        type: "array",
        description: "Ediciones a aplicar al documento",
        items: {
          type: "object",
          properties: {
            range: {
              type: "object",
              properties: {
                start: {
                  type: "object",
                  properties: {
                    line: { type: "number" },
                    character: { type: "number" }
                  },
                  required: ["line", "character"]
                },
                end: {
                  type: "object",
                  properties: {
                    line: { type: "number" },
                    character: { type: "number" }
                  },
                  required: ["line", "character"]
                }
              },
              required: ["start", "end"]
            },
            text: { type: "string" }
          },
          required: ["range", "text"]
        }
      }
    },
    required: ["documentUri", "edits"]
  },
  func: async (input: ApplyTextEditParams) => {
    try {
      // Obtener la instancia del ToolRunner
      const toolRunner = ToolRunner.getInstance();
      
      // Invocar la implementación concreta según el entorno actual
      const result = await toolRunner.runTool<boolean>("applyTextEdit", input, {
        environment: toolRunner.getDefaultEnvironment(),
        timeout: 5000
      });
      
      return JSON.stringify({
        success: true,
        data: result,
        message: "Ediciones aplicadas correctamente"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al aplicar las ediciones';
      return JSON.stringify({
        success: false,
        error: errorMessage,
        message: `Error al aplicar las ediciones: ${errorMessage}`
      });
    }
  }
});