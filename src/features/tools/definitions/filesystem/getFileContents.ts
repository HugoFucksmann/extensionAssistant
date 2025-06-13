// src/features/tools/definitions/filesystem/getFileContents.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { z } from 'zod';
import { ToolDefinition, ToolResult } from '../../types';
import { resolveFileFromInput, searchFiles } from '../../../../shared/utils/pathUtils';

// Esquema Zod con autocorrección MEJORADO
export const getFileContentsParamsSchema = z.preprocess((input) => {
  if (typeof input === 'object' && input !== null) {
    const rawInput = input as any;
    // Si el LLM envía 'filePaths' en lugar de 'filePath', lo corregimos.
    if ('filePaths' in rawInput && !('filePath' in rawInput)) {
      const filePaths = rawInput.filePaths;
      if (Array.isArray(filePaths) && filePaths.length > 0) {
        // 1. Creamos una copia del input para no mutar el original.
        const correctedInput = { ...rawInput };
        // 2. Añadimos la clave correcta ('filePath') con el primer valor del array.
        correctedInput.filePath = filePaths[0];
        // 3. ELIMINAMOS la clave incorrecta ('filePaths') del objeto.
        delete correctedInput.filePaths;
        // 4. Devolvemos el objeto corregido y limpio.
        return correctedInput;
      }
    }
  }
  // Si no hay nada que corregir, devolvemos el input original.
  return input;
}, z.object({
  filePath: z.string().min(1, { message: "File path cannot be empty." })
}).strict()); // .strict() ahora recibirá un objeto limpio.

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
  description: 'Gets the content of a single, specified file. The path must be provided in the "filePath" parameter. If multiple paths are sent, only the first one is processed. The path can be absolute, relative to the workspace root, or just a filename.',
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
    const { filePath: requestedPath } = params;

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

      const isBinary = content.length > 0 && !/^[ -~]*$/.test(content);
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
      return {
        success: false,
        error: `Failed to get file contents for "${requestedPath}": ${error.message}`,
        data: undefined
      };
    }
  }
};

async function getSimilarFiles(vscodeAPI: typeof vscode, fileUri: vscode.Uri): Promise<string[]> {
  try {
    const relativePath = vscodeAPI.workspace.asRelativePath(fileUri, false);
    const dirName = path.dirname(relativePath);
    const fileName = path.basename(relativePath);
    const allFiles = await searchFiles(vscodeAPI, undefined, 100);
    const filesInSameDir = allFiles
      .filter(file => {
        if (file.relativePath === relativePath) return false;
        const fileDir = path.dirname(file.relativePath);
        return fileDir === dirName;
      })
      .map(file => file.relativePath)
      .sort((a, b) => {
        const aName = path.basename(a);
        const bName = path.basename(b);
        const aScore = similarity(fileName, aName);
        const bScore = similarity(fileName, bName);
        return bScore - aScore;
      })
      .slice(0, 5);
    return filesInSameDir;
  } catch (error) {
    console.error('Error getting similar files:', error);
    return [];
  }
}

function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  if (longer.startsWith(shorter)) return 0.9;
  if (s1.substring(0, 3) === s2.substring(0, 3)) return 0.6;
  if (s1.endsWith(s2) || s2.endsWith(s1)) return 0.4;
  return 0.1;
}