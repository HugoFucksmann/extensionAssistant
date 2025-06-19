// src/features/tools/definitions/filesystem/getFileContents.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult } from '../../types';
import { resolveFileFromInput } from '../../../../shared/utils/pathUtils';
import { correctFilePathsToSinglePath } from '../../../../shared/utils/zodUtils';

export const getFileContentsParamsSchema = z.preprocess(
  correctFilePathsToSinglePath('filePath'),
  z.object({
    filePath: z.string().min(1, { message: "File path cannot be empty." })
  }).strict()
);

type FileContentsData = {
  filePath: string;
  content: string;
  fileSize: number;
  lastModified: string;
  encoding: string;
  mimeType: string;
  isBinary: boolean;
  lineCount: number;
};

export const getFileContents: ToolDefinition<typeof getFileContentsParamsSchema, FileContentsData> = {
  name: 'getFileContents',
  description: 'Gets the content of a single, specified file. The path can be absolute, relative to the workspace root, or just a filename.',
  parametersSchema: getFileContentsParamsSchema,
  uiFeedback: true,
  getUIDescription: (params) => `Leer archivo: ${params?.filePath?.split(/[\\/]/).pop() || 'archivo'}`,

  async execute(params, context): Promise<ToolResult<FileContentsData>> {
    const { filePath: requestedPath } = params;

    try {
      const resolution = await resolveFileFromInput(context.vscodeAPI, requestedPath);

      if (!resolution.success || !resolution.uri) {
        return {
          success: false,
          error: resolution.error || `File not found: ${requestedPath}`,
          warnings: resolution.suggestions,
        };
      }

      const fileContentUint8Array = await context.vscodeAPI.workspace.fs.readFile(resolution.uri);
      const content = new TextDecoder().decode(fileContentUint8Array);
      const stat = await context.vscodeAPI.workspace.fs.stat(resolution.uri);

      const isBinary = content.length > 0 && content.includes('\uFFFD');
      const mimeType = isBinary ? 'application/octet-stream' : 'text/plain';

      return {
        success: true,
        data: {
          filePath: resolution.relativePath!,
          content,
          fileSize: stat.size,
          lastModified: new Date(stat.mtime).toISOString(),
          encoding: 'utf-8',
          mimeType,
          isBinary,
          lineCount: content.split('\n').length,
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to get file contents for "${requestedPath}": ${error.message}`,
      };
    }
  }
};