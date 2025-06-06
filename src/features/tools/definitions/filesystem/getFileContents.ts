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