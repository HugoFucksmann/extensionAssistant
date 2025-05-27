// src/features/tools/definitions/filesystem/writeToFile.ts
import * as vscode from 'vscode';
import { ToolDefinition, ToolPermission, ToolResult, ToolExecutionContext } from '../../types';
import { resolveWorkspacePath } from '../utils'; // Utilidad para resolver paths

export const writeToFile: ToolDefinition = {
  name: 'writeToFile',
  description: 'Writes or overwrites content to a specified file. Creates parent directories if they do not exist. Assumes path is relative to the workspace root.',
  parameters: {
    path: { type: 'string', description: 'Workspace-relative path to the file.', required: true },
    content: { type: 'string', description: 'The content to write to the file.', required: true }
  },
  requiredPermissions: ['filesystem.write'],
  async execute(
    params: { path: string; content: string },
    context?: ToolExecutionContext
  ): Promise<ToolResult<{ filePath: string }>> {
    if (!context?.vscodeAPI) {
      return { success: false, error: 'VSCode API context not available.' };
    }
    const { path, content } = params;
    let targetUri: vscode.Uri | undefined;

    try {
      targetUri = resolveWorkspacePath(context.vscodeAPI, path);
      if (!targetUri) {
        return { success: false, error: 'Could not resolve path in workspace. No workspace folder open or path is invalid.' };
      }
      
      // Asegurar que el directorio padre exista (createDirectory es recursivo por defecto)
      const dirUri = vscode.Uri.joinPath(targetUri, '..');
      try {
          await context.vscodeAPI.workspace.fs.stat(dirUri);
      } catch (e) { // Directorio no existe
          await context.vscodeAPI.workspace.fs.createDirectory(dirUri);
      }

      await context.vscodeAPI.workspace.fs.writeFile(targetUri, new TextEncoder().encode(content));
      return { success: true, data: { filePath: targetUri.fsPath } };
    } catch (error: any) {
      context?.dispatcher?.systemError('Error executing writeToFile', error, 
        { toolName: 'writeToFile', params: { path: params.path, content: params.content.substring(0,100) + '...' }, chatId: context.chatId } // Truncar content para logs
      );
      return { success: false, error: `Failed to write to file "${path}": ${error.message}` };
    }
  }
};