// src/modules/tools/implementation/filesystem/writeToFile.ts
import { ToolRunner } from "../../core/ToolRunner";
import { LangChainTool } from "../../core/CustomToolTypes";

// Definición de parámetros de la herramienta
interface WriteToFileParams {
  path: string;
  content: string;
  encoding?: BufferEncoding;
  relativeTo?: 'workspace' | 'absolute';
  createIfNotExists?: boolean;
}

/**
 * Tool para escribir contenido en un archivo
 */
export const writeToFileTool = new LangChainTool({
  name: "writeToFile",
  description: "Escribe contenido en un archivo del sistema de archivos",
  schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Ruta del archivo a escribir"
      },
      content: {
        type: "string",
        description: "Contenido a escribir en el archivo"
      },
      encoding: {
        type: "string",
        description: "Codificación del archivo (por defecto: 'utf-8')"
      },
      relativeTo: {
        type: "string",
        enum: ["workspace", "absolute"],
        description: "Si la ruta es relativa al workspace o absoluta"
      },
      createIfNotExists: {
        type: "boolean",
        description: "Crear el archivo si no existe"
      }
    },
    required: ["path", "content"]
  },
  func: async (input: WriteToFileParams) => {
    try {
      // Obtener la instancia del ToolRunner
      const toolRunner = ToolRunner.getInstance();
      
      // Invocar la implementación concreta según el entorno actual
      const result = await toolRunner.runTool<boolean>("writeToFile", input, {
        environment: toolRunner.getDefaultEnvironment(),
        timeout: 10000
      });
      
      return JSON.stringify({ 
        success: true, 
        data: result,
        message: `Archivo escrito correctamente: ${input.path}`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ 
        success: false, 
        error: `Error al escribir el archivo: ${errorMessage}` 
      });
    }
  }
});