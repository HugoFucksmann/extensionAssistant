// src/features/tools/definitions/filesystem/deletePath.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult, } from '../../types';
import { buildWorkspaceUri } from '@shared/utils/pathUtils';

export const deletePathParamsSchema = z.preprocess((input) => {
  if (typeof input === 'object' && input !== null) {
    const rawInput = input as any;
    // Corregimos 'filePaths' a 'path'
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
  path: z.string().min(1, { message: "Path to delete cannot be empty." })
}).strict());

export type DeletePathResultData = {
  path: string;
  deleted: boolean;
}

export const deletePath: ToolDefinition<typeof deletePathParamsSchema, DeletePathResultData> = {
  getUIDescription: (params) => `Eliminar: ${params?.path?.split(/[\\/]/).pop() || 'ítem'}`,
  uiFeedback: true,
  name: 'deletePath',
  description: 'Deletes a file or directory recursively. The path must be provided in the "path" parameter. If multiple paths are sent, only the first one is processed. Uses trash by default if available on the system.',
  parametersSchema: deletePathParamsSchema,
  async execute(
    params,
    context
  ): Promise<ToolResult<{ path: string; deleted: boolean }>> {
    const { path } = params;
    let targetUri: vscode.Uri | undefined;

    try {
      targetUri = buildWorkspaceUri(context.vscodeAPI, path);
      if (!targetUri) {
        return { success: false, error: 'Could not resolve path in workspace. Ensure a workspace is open and the path is valid.', data: undefined };
      }

      try {
        await context.vscodeAPI.workspace.fs.stat(targetUri);
      } catch (e) {
        return { success: false, error: `Path not found: ${context.vscodeAPI.workspace.asRelativePath(targetUri, false)}`, data: undefined };
      }

      await context.vscodeAPI.workspace.fs.delete(targetUri, { recursive: true, useTrash: true });
      return { success: true, data: { path: context.vscodeAPI.workspace.asRelativePath(targetUri, false), deleted: true } };
    } catch (error: any) {
      return { success: false, error: `Failed to delete path "${path}": ${error.message}`, data: undefined };
    }
  }
};