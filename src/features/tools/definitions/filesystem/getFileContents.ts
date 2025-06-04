// src/features/tools/definitions/filesystem/getFileContents.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { z } from 'zod';
import { ToolDefinition, ToolResult } from '../../types';
import { resolveFileFromInput } from '../../../../shared/utils/pathUtils';
import { listFilesUtil } from '../../../../shared/utils/listFiles';

// Esquema Zod para los parámetros
export const getFileContentsParamsSchema = z.object({
  path: z.string().min(1, { message: "File path cannot be empty." })
}).strict();

export const getFileContents: ToolDefinition<
  typeof getFileContentsParamsSchema,
  {
    filePath: string;
    content: string;
    availableFiles?: string[];
    fileSize: number;
    lastModified: string;
    encoding: string;
    mimeType: string;
    isBinary: boolean;
    lineCount: number;
  }
> = {
  uiFeedback: true,
  name: 'getFileContents',
  description: 'Gets the content of a specified file with detailed metadata. The path can be absolute, relative to the workspace root, or just a filename. The tool will automatically resolve the correct path.',
  parametersSchema: getFileContentsParamsSchema,
  async execute(
    params,
    context
  ): Promise<ToolResult<{
    filePath: string;
    content: string;
    availableFiles?: string[];
    fileSize: number;
    lastModified: string;
    encoding: string;
    mimeType: string;
    isBinary: boolean;
    lineCount: number;
  }>> {
    const { path: requestedPath } = params;

    try {

      const resolution = await resolveFileFromInput(context.vscodeAPI, requestedPath);

      if (!resolution.success) {
        return {
          success: false,
          error: resolution.error || `File not found: ${requestedPath}`,
          data: undefined
        };
      }


      const fileContentUint8Array = await context.vscodeAPI.workspace.fs.readFile(resolution.uri!);
      const content = new TextDecoder().decode(fileContentUint8Array);


      const stat = await context.vscodeAPI.workspace.fs.stat(resolution.uri!);
      const lines = content.split('\n').length;

      const isBinary = content.length > 0 && !/^[ - ]*$/.test(content);
      const mimeType = isBinary ? 'application/octet-stream' : 'text/plain';


      const similarFiles = await getSimilarFiles(context.vscodeAPI, resolution.uri!);

      return {
        success: true,
        data: {
          filePath: resolution.relativePath!,
          content,
          availableFiles: similarFiles,
          fileSize: stat.size,
          lastModified: new Date(stat.mtime).toISOString(),
          encoding: 'utf-8',
          mimeType,
          isBinary,
          lineCount: lines
        }
      };
    } catch (error: any) {

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
    const fileName = path.basename(relativePath);

    // Usar listFilesUtil para obtener archivos en el mismo directorio
    const files = await listFilesUtil(vscodeAPI, `${dirName}/*`);

    // Filtrar archivos en el mismo directorio y ordenar por similitud con el nombre del archivo
    return files
      .map(file => file.path)
      .filter(path => {
        // Excluir el archivo actual
        if (path === relativePath) return false;
        
        // Incluir archivos en el mismo directorio
        const fileDir = path.split('/').slice(0, -1).join('/');
        return fileDir === dirName;
      })
      .sort((a, b) => {
        // Ordenar por similitud con el nombre del archivo
        const aName = path.basename(a);
        const bName = path.basename(b);
        
        // Priorizar archivos con nombres similares
        const aScore = similarity(fileName, aName);
        const bScore = similarity(fileName, bName);
        
        return bScore - aScore; // Orden descendente por puntuación de similitud
      })
      .slice(0, 5); // Limitar a 5 resultados
  } catch (error) {
    console.error('Error getting similar files:', error);
    return [];
  }
}

/**
 * Calcula la similitud entre dos cadenas usando la distancia de Levenshtein
 */
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  // Si uno es prefijo del otro, dar mayor puntuación
  if (longer.startsWith(shorter)) return 0.9;
  
  // Si comparten el mismo prefijo de 3 caracteres, dar puntuación media
  if (s1.substring(0, 3) === s2.substring(0, 3)) return 0.6;
  
  // Si comparten el mismo sufijo, dar puntuación media-baja
  if (s1.endsWith(s2) || s2.endsWith(s1)) return 0.4;
  
  // Si no hay coincidencias, puntuación baja
  return 0.1;
}