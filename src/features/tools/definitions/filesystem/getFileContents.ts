// src/features/tools/definitions/filesystem/getFileContents.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { z } from 'zod';
import { ToolDefinition, ToolResult } from '../../types';
import { resolveFileFromInput } from '../../../../shared/utils/pathUtils';

// Esquema Zod para los parámetros
export const getFileContentsParamsSchema = z.object({
  path: z.string().min(1, { message: "File path cannot be empty." })
}).strict(); 

export const getFileContents: ToolDefinition<
  typeof getFileContentsParamsSchema, 
  { filePath: string; content: string; availableFiles?: string[] }
> = {
  uiFeedback: true,
  name: 'getFileContents',
  description: 'Gets the content of a specified file. The path can be absolute, relative to the workspace root, or just a filename. The tool will automatically resolve the correct path.',
  parametersSchema: getFileContentsParamsSchema,
  async execute(
    params, 
    context 
  ): Promise<ToolResult<{ filePath: string; content: string; availableFiles?: string[] }>> {
    const { path: requestedPath } = params;

    try {
      // Resolver el archivo usando la nueva función unificada
      const resolution = await resolveFileFromInput(context.vscodeAPI, requestedPath);
      
      if (!resolution.success) {
        return {
          success: false,
          error: resolution.error || `File not found: ${requestedPath}`,
          data: undefined
        };
      }

      // Leer el contenido del archivo
      const fileContentUint8Array = await context.vscodeAPI.workspace.fs.readFile(resolution.uri!);
      const content = new TextDecoder().decode(fileContentUint8Array);
      
      // Obtener archivos similares para sugerencias
      const similarFiles = await getSimilarFiles(context.vscodeAPI, resolution.uri!);
      
      return {
        success: true,
        data: {
          filePath: resolution.relativePath!,
          content,
          availableFiles: similarFiles
        }
      };
    } catch (error: any) {
      // En caso de error inesperado, intentar obtener sugerencias
      const fallbackResolution = await resolveFileFromInput(context.vscodeAPI, requestedPath);
      
      return {
        success: false,
        error: `Failed to get file contents for "${requestedPath}": ${error.message}`,
        data: undefined
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
    const relativePath = vscodeAPI.workspace.asRelativePath(fileUri, false);
    const dirName = path.dirname(relativePath);
    
    const pattern = `${dirName}/**`;
    const filesInSameDir = await vscodeAPI.workspace.findFiles(pattern, '**/node_modules/**', 10);
    
    return filesInSameDir
      .map(uri => vscodeAPI.workspace.asRelativePath(uri, false))
      .filter(path => path !== relativePath);
  } catch (error) {
    console.error('Error getting similar files:', error);
    return [];
  }
}