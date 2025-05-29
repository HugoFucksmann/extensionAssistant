// src/features/tools/definitions/filesystem/getFileContents.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { z } from 'zod';
import { ToolDefinition, ToolResult, ToolExecutionContext, ToolPermission } from '../../types';
import { 
  resolveFilePath, 
  findFilesByName, 
  getWorkspaceFilesList, 
  groupFilesByFolder 
} from '../../../../shared/utils/pathUtils';

// Esquema Zod para los parámetros
export const getFileContentsParamsSchema = z.object({
  path: z.string().min(1, { message: "File path cannot be empty." }),
  // Parámetro opcional para forzar la búsqueda por nombre de archivo
  searchByName: z.boolean().optional().describe("If true, search for the file by name instead of path"),
  // Parámetro opcional para búsqueda difusa
  fuzzyMatch: z.boolean().optional().describe("If true, use fuzzy matching when searching by name")
}).strict(); // No permitir parámetros extra

export const getFileContents: ToolDefinition<typeof getFileContentsParamsSchema, { filePath: string; content: string; availableFiles?: string[] }> = {
  name: 'getFileContents',
  description: 'Gets the content of a specified file. The path can be absolute or relative to the workspace root. If the file is not found, the tool will attempt to search for it in the workspace. You can also search by filename using the searchByName parameter.',
  parametersSchema: getFileContentsParamsSchema,
  async execute(
    params, // Tipado como: { path: string, searchByName?: boolean, fuzzyMatch?: boolean }
    context // Tipado como: ToolExecutionContext
  ): Promise<ToolResult<{ filePath: string; content: string; availableFiles?: string[] }>> {
    const { path: requestedPath, searchByName = false, fuzzyMatch = false } = params;
    let fileUri: vscode.Uri | undefined;

    try {
      // Obtener una lista de archivos disponibles para sugerencias
      const availableFiles = await getWorkspaceFilesList(context.vscodeAPI, 30);
      
      // Estrategia de búsqueda basada en los parámetros
      if (searchByName) {
        // Búsqueda por nombre de archivo
        const fileName = path.basename(requestedPath);
        const searchResults = await findFilesByName(context.vscodeAPI, fileName, fuzzyMatch);
        
        if (searchResults.length === 0) {
          // No se encontró ningún archivo con ese nombre
          return { 
            success: false, 
            error: `File not found in workspace: ${fileName}`, 
            data: { 
              filePath: requestedPath, 
              content: '', 
              availableFiles: availableFiles.slice(0, 10) // Sugerir algunos archivos disponibles
            }
          };
        } else if (searchResults.length === 1) {
          // Se encontró exactamente un archivo, usarlo
          fileUri = searchResults[0].uri;
        } else {
          // Se encontraron múltiples archivos, devolver información sobre ellos
          const matchingFiles = searchResults.map(r => r.relativePath);
          
          return { 
            success: false, 
            error: `Multiple files found with name "${fileName}". Please specify a more precise path.`, 
            data: { 
              filePath: requestedPath, 
              content: '', 
              availableFiles: matchingFiles // Devolver los archivos que coinciden
            }
          };
        }
      } else {
        // Búsqueda por ruta (absoluta o relativa)
        fileUri = await resolveFilePath(context.vscodeAPI, requestedPath);
        
        if (!fileUri) {
          // Si no se encuentra por ruta, intentar buscar por nombre como respaldo
          const fileName = path.basename(requestedPath);
          const searchResults = await findFilesByName(context.vscodeAPI, fileName, false);
          
          if (searchResults.length === 0) {
            // No se encontró ningún archivo
            return { 
              success: false, 
              error: `File not found: ${requestedPath}`, 
              data: { 
                filePath: requestedPath, 
                content: '', 
                availableFiles: availableFiles.slice(0, 10) // Sugerir algunos archivos disponibles
              }
            };
          } else if (searchResults.length === 1) {
            // Se encontró exactamente un archivo, usarlo
            fileUri = searchResults[0].uri;
          } else {
            // Se encontraron múltiples archivos, devolver información sobre ellos
            const matchingFiles = searchResults.map(r => r.relativePath);
            
            return { 
              success: false, 
              error: `Multiple files found that match "${fileName}". Please specify a more precise path.`, 
              data: { 
                filePath: requestedPath, 
                content: '', 
                availableFiles: matchingFiles // Devolver los archivos que coinciden
              }
            };
          }
        }
      }

      // Leer el contenido del archivo
      const fileContentUint8Array = await context.vscodeAPI.workspace.fs.readFile(fileUri);
      const content = new TextDecoder().decode(fileContentUint8Array);
      
      // Devolver el contenido con la ruta relativa del archivo
      const relativePath = context.vscodeAPI.workspace.asRelativePath(fileUri, false);
      return { 
        success: true, 
        data: { 
          filePath: relativePath, 
          content,
          // Incluir archivos relacionados (en la misma carpeta) como sugerencia
          availableFiles: await getSimilarFiles(context.vscodeAPI, fileUri)
        } 
      };
    } catch (error: any) {
      // Obtener una lista de archivos disponibles para sugerencias
      const availableFiles = await getWorkspaceFilesList(context.vscodeAPI, 15);
      
      // El ToolRegistry se encarga del log y evento TOOL_EXECUTION_ERROR genérico.
      // Aquí solo retornamos el error específico de la herramienta.
      return { 
        success: false, 
        error: `Failed to get file contents for "${requestedPath}": ${error.message}`,
        data: {
          filePath: requestedPath,
          content: '',
          availableFiles
        }
      };
    }
  }
};

/**
 * Obtiene archivos similares o relacionados al archivo actual
 * @param vscodeAPI API de VS Code
 * @param fileUri URI del archivo actual
 * @returns Lista de rutas relativas de archivos similares
 */
async function getSimilarFiles(vscodeAPI: typeof vscode, fileUri: vscode.Uri): Promise<string[]> {
  try {
    // Obtener la carpeta del archivo actual
    const relativePath = vscodeAPI.workspace.asRelativePath(fileUri, false);
    const dirName = path.dirname(relativePath);
    
    // Buscar archivos en la misma carpeta
    const pattern = `${dirName}/**`;
    const filesInSameDir = await vscodeAPI.workspace.findFiles(pattern, '**/node_modules/**', 10);
    
    // Convertir a rutas relativas y excluir el archivo actual
    return filesInSameDir
      .map(uri => vscodeAPI.workspace.asRelativePath(uri, false))
      .filter(path => path !== relativePath);
  } catch (error) {
    console.error('Error getting similar files:', error);
    return [];
  }
}
