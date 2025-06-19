// src/features/tools/definitions/filesystem/writeToFile.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult } from '../../types';
import { buildWorkspaceUri } from '../../../../shared/utils/pathUtils';
import { correctFilePathsToSinglePath } from '../../../../shared/utils/zodUtils';

export const writeToFileParamsSchema = z.preprocess(
  correctFilePathsToSinglePath('path'),
  z.object({
    path: z.string().min(1, { message: "File path cannot be empty." }),
    content: z.string()
  }).strict()
);

type WriteToFileResultData = {
  filePath: string;
};

export const writeToFile: ToolDefinition<typeof writeToFileParamsSchema, WriteToFileResultData> = {
  name: 'writeToFile',
  description: 'Writes or overwrites content to a specified file. Creates parent directories if they do not exist. The path must be relative to the workspace root.',
  parametersSchema: writeToFileParamsSchema,
  uiFeedback: true,
  getUIDescription: (params) => `Escribir en archivo: ${params?.path?.split(/[\\/]/).pop() || 'archivo'}`,

  async execute(params, context): Promise<ToolResult<WriteToFileResultData>> {
    const { path, content } = params;
    let targetUri: vscode.Uri | undefined;

    try {
      targetUri = buildWorkspaceUri(context.vscodeAPI, path);
      if (!targetUri) {
        return { success: false, error: 'Could not resolve path in workspace. Ensure a workspace is open and the path is valid.' };
      }

      const dirUri = vscode.Uri.joinPath(targetUri, '..');
      await context.vscodeAPI.workspace.fs.createDirectory(dirUri);
      await context.vscodeAPI.workspace.fs.writeFile(targetUri, new TextEncoder().encode(content));

      return { success: true, data: { filePath: context.vscodeAPI.workspace.asRelativePath(targetUri, false) } };
    } catch (error: any) {
      return { success: false, error: `Failed to write to file "${path}": ${error.message}` };
    }
  }
};