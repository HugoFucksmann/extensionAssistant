// src/modules/tools/implementation/filesystem/listFiles.ts
import { ToolRunner } from "../../core/ToolRunner";
import { LangChainTool } from "../../core/CustomToolTypes";

// Definición de parámetros de la herramienta
interface ListFilesParams {
  path: string;
  recursive?: boolean;
  pattern?: string; // Patrón glob para filtrar archivos
  relativeTo?: 'workspace' | 'absolute';
  includeHidden?: boolean;
}

// Tipo para el resultado de la operación
interface FileInfo {
  name: string;       // Nombre del archivo
  path: string;       // Ruta completa del archivo
  isDirectory: boolean; // Si es un directorio
  size?: number;      // Tamaño en bytes (opcional)
  modified?: string;  // Fecha de última modificación (opcional)
}

/**
 * Tool para listar archivos en un directorio
 */
export const listFilesTool = new LangChainTool({
  name: "listFiles",
  description: "Lista archivos y directorios en una ruta especificada",
  schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Ruta del directorio a listar"
      },
      recursive: {
        type: "boolean",
        description: "Si se deben listar archivos en subdirectorios"
      },
      pattern: {
        type: "string",
        description: "Patrón glob para filtrar archivos (ej: '*.js', '**/*.ts')"
      },
      relativeTo: {
        type: "string",
        enum: ["workspace", "absolute"],
        description: "Si la ruta es relativa al workspace o absoluta"
      },
      includeHidden: {
        type: "boolean",
        description: "Incluir archivos ocultos (que comienzan con punto)"
      }
    },
    required: ["path"]
  },
  func: async (input: ListFilesParams) => {
    try {
      // Obtener la instancia del ToolRunner
      const toolRunner = ToolRunner.getInstance();
      
      // Invocar la implementación concreta según el entorno actual
      const result = await toolRunner.runTool<FileInfo[]>("listFiles", input, {
        environment: toolRunner.getDefaultEnvironment(),
        timeout: 30000 // Tiempo más largo para directorios grandes o recursivos
      });
      
      return JSON.stringify({ 
        success: true, 
        data: result,
        count: result.length,
        message: `Se encontraron ${result.length} archivos/directorios en ${input.path}`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ 
        success: false, 
        error: `Error al listar archivos: ${errorMessage}` 
      });
    }
  }
});