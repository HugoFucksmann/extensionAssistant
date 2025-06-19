// src/features/tools/definitions/filesystem/deletePath.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult } from '../../types';
import { buildWorkspaceUri } from '../../../../shared/utils/pathUtils';
import { correctFilePathsToSinglePath } from '../../../../shared/utils/zodUtils';

export const deletePathParamsSchema = z.preprocess(
  correctFilePathsToSinglePath('path'),
  z.object({
    path: z.string().min(1, { message: "Path to delete cannot be empty." })
  }).strict()
);

export type DeletePathResultData = {
  path: string;
  deleted: boolean;
};

export const deletePath: ToolDefinition<typeof deletePathParamsSchema, DeletePathResultData> = {
  name: 'deletePath',
  description: 'Deletes a file or directory recursively. The path must be provided in the "path" parameter. Uses trash by default if available on the system.',
  parametersSchema: deletePathParamsSchema,
  uiFeedback: true,
  getUIDescription: (params) => `Eliminar: ${params?.path?.split(/[\\/]/).pop() || 'ítem'}`,

  async execute(params, context): Promise<ToolResult<DeletePathResultData>> {
    const { path } = params;
    let targetUri: vscode.Uri | undefined;

    try {
      targetUri = buildWorkspaceUri(context.vscodeAPI, path);
      if (!targetUri) {
        return { success: false, error: 'Could not resolve path in workspace. Ensure a workspace is open and the path is valid.' };
      }

      const relativePath = context.vscodeAPI.workspace.asRelativePath(targetUri, false);
      try {
        await context.vscodeAPI.workspace.fs.stat(targetUri);
      } catch (e) {
        return { success: false, error: `Path not found: ${relativePath}` };
      }

      await context.vscodeAPI.workspace.fs.delete(targetUri, { recursive: true, useTrash: true });
      return { success: true, data: { path: relativePath, deleted: true } };
    } catch (error: any) {
      return { success: false, error: `Failed to delete path "${path}": ${error.message}` };
    }
  }
};