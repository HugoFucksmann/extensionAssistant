// src/modules/tools/implementation/filesystem/readFileTool.ts
import { ToolRunner } from "../../core/ToolRunner";
import { LangChainTool } from "../../core/CustomToolTypes";

// Definición de parámetros de la herramienta
interface ReadFileParams {
  path: string;
  encoding?: BufferEncoding;
  relativeTo?: 'workspace' | 'absolute';
}

/**
 * Tool para leer el contenido de un archivo
 */
export const readFileTool = new LangChainTool({
  name: "readFile",
  description: "Lee el contenido de un archivo del sistema de archivos",
  schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Ruta del archivo a leer"
      },
      encoding: {
        type: "string",
        description: "Codificación del archivo (por defecto: 'utf-8')"
      },
      relativeTo: {
        type: "string",
        enum: ["workspace", "absolute"],
        description: "Si la ruta es relativa al workspace o absoluta"
      }
    },
    required: ["path"]
  },
  func: async (input: ReadFileParams) => {
    try {
      // Obtener la instancia del ToolRunner
      const toolRunner = ToolRunner.getInstance();
      
      // Invocar la implementación concreta según el entorno actual
      const result = await toolRunner.runTool<string>("readFile", input, {
        environment: toolRunner.getDefaultEnvironment(),
        timeout: 10000
      });
      
      return JSON.stringify({ success: true, data: result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ 
        success: false, 
        error: `Error al leer el archivo: ${errorMessage}` 
      });
    }
  }
});