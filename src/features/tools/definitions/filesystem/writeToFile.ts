// src/features/tools/definitions/filesystem/writeToFile.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult, } from '../../types';
import { buildWorkspaceUri } from '@shared/utils/pathUtils';

export const writeToFileParamsSchema = z.preprocess((input) => {
  if (typeof input === 'object' && input !== null) {
    const rawInput = input as any;
    if ('filePaths' in rawInput && !('path' in rawInput)) {
      const filePaths = rawInput.filePaths;
      if (Array.isArray(filePaths) && filePaths.length > 0) {
        const correctedInput = { ...rawInput };
        correctedInput.path = filePaths[0];
        delete correctedInput.filePaths;
        return correctedInput;
      }
    }
  }
  return input;
}, z.object({
  path: z.string().min(1, { message: "File path cannot be empty." }),
  content: z.string()
}).strict());

export const writeToFile: ToolDefinition<typeof writeToFileParamsSchema, { filePath: string }> = {
  getUIDescription: (params) => `Escribir en archivo: ${params?.path?.split(/[\\/]/).pop() || 'archivo'}`,
  uiFeedback: true,
  name: 'writeToFile',
  description: 'Writes or overwrites content to a specified file. The path must be provided in the "path" parameter. If multiple paths are sent, only the first one is processed. Creates parent directories if they do not exist. The path must be relative to the workspace root.',
  parametersSchema: writeToFileParamsSchema,
  async execute(
    params,
    context
  ): Promise<ToolResult<{ filePath: string }>> {
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