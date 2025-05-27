// src/features/tools/definitions/filesystem/deletePath.ts
import * as vscode from 'vscode';
import { ToolDefinition, ToolPermission, ToolResult, ToolExecutionContext } from '../../types';
import { resolveWorkspacePath } from '../utils'; // Utilidad para resolver paths

export const deletePath: ToolDefinition = {
  name: 'deletePath',
  description: 'Deletes a file or directory recursively. Assumes path is relative to the workspace root. Uses trash by default if available.',
  parameters: {
    path: { type: 'string', description: 'Workspace-relative path to delete.', required: true }
    // useTrash: { type: 'boolean', description: 'Move to trash instead of permanent delete.', default: true, required: false } // Omitido para simplicidad, siempre usa trash
  },
  requiredPermissions: ['filesystem.write'],
  async execute(
    params: { path: string },
    context?: ToolExecutionContext
  ): Promise<ToolResult<{ path: string; deleted: boolean }>> {
    if (!context?.vscodeAPI) {
      return { success: false, error: 'VSCode API context not available.' };
    }
    const { path } = params;
    let targetUri: vscode.Uri | undefined;

    try {
      targetUri   = resolveWorkspacePath(context.vscodeAPI, path) ;
      if (!targetUri) {
        return { success: false, error: 'Could not resolve path in workspace. No workspace folder open or path is invalid.' };
      }

      // Verificar si existe antes de intentar borrar para dar un error más claro
      try {
        await context.vscodeAPI.workspace.fs.stat(targetUri);
      } catch (e) {
        return { success: false, error: `Path not found: ${targetUri.fsPath}` };
      }

      await context.vscodeAPI.workspace.fs.delete(targetUri, { recursive: true, useTrash: true });
      return { success: true, data: { path: targetUri.fsPath, deleted: true } };
    } catch (error: any) {
      context?.dispatcher?.systemError('Error executing deletePath', error, 
        { toolName: 'deletePath', params, chatId: context.chatId }
      );
      return { success: false, error: `Failed to delete path "${path}": ${error.message}` };
    }
  }
};