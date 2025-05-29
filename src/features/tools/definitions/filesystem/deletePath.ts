// src/features/tools/definitions/filesystem/deletePath.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult, ToolExecutionContext, ToolPermission } from '../../types';
import { resolveWorkspacePath } from '../utils';

// Esquema Zod para los parámetros
export const deletePathParamsSchema = z.object({
  path: z.string().min(1, { message: "Path to delete cannot be empty." })
  // useTrash: z.boolean().optional().default(true) // Podríamos añadirlo, pero VSCode usa trash por defecto si puede
}).strict();

export const deletePath: ToolDefinition<typeof deletePathParamsSchema, { path: string; deleted: boolean }> = {
  name: 'deletePath',
  description: 'Deletes a file or directory recursively. The path must be relative to the workspace root. Uses trash by default if available on the system.',
  parametersSchema: deletePathParamsSchema,
  async execute(
    params, // Tipado como: { path: string }
    context
  ): Promise<ToolResult<{ path: string; deleted: boolean }>> {
    const { path } = params;
    let targetUri: vscode.Uri | undefined;

    try {
      targetUri = resolveWorkspacePath(context.vscodeAPI, path);
      if (!targetUri) {
        return { success: false, error: 'Could not resolve path in workspace. Ensure a workspace is open and the path is valid.' };
      }

      try {
        await context.vscodeAPI.workspace.fs.stat(targetUri);
      } catch (e) {
        return { success: false, error: `Path not found: ${context.vscodeAPI.workspace.asRelativePath(targetUri, false)}` };
      }

      // { recursive: true, useTrash: true } son los defaults de vscode.workspace.fs.delete
      await context.vscodeAPI.workspace.fs.delete(targetUri, { recursive: true, useTrash: true });
      return { success: true, data: { path: context.vscodeAPI.workspace.asRelativePath(targetUri, false), deleted: true } };
    } catch (error: any) {
      return { success: false, error: `Failed to delete path "${path}": ${error.message}` };
    }
  }
};