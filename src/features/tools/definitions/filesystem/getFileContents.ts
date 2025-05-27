// src/features/tools/definitions/filesystem/getFileContents.ts
import * as vscode from 'vscode';
import { ToolDefinition, ToolPermission, ToolResult, ToolExecutionContext } from '../../types';
import { resolveWorkspacePath } from '../utils'; // Utilidad para resolver paths

export const getFileContents: ToolDefinition = {
  name: 'getFileContents',
  description: 'Gets the content of a specified file. Assumes path is relative to the workspace root.',
  parameters: {
    path: { type: 'string', description: 'Workspace-relative path to the file.', required: true }
  },
  requiredPermissions: ['filesystem.read'],
  async execute(
    params: { path: string },
    context?: ToolExecutionContext
  ): Promise<ToolResult<{ filePath: string; content: string }>> {
    if (!context?.vscodeAPI) {
      return { success: false, error: 'VSCode API context not available.' };
    }
    const { path } = params;
    let fileUri: vscode.Uri | undefined;

    try {
      fileUri = resolveWorkspacePath(context.vscodeAPI, path);
      if (!fileUri) {
        return { success: false, error: 'Could not resolve path in workspace. No workspace folder open or path is invalid.' };
      }

      // Verificar existencia primero
      try {
        await context.vscodeAPI.workspace.fs.stat(fileUri);
      } catch (e) {
        return { success: false, error: `File not found or not accessible: ${fileUri.fsPath}` };
      }

      const fileContentUint8Array = await context.vscodeAPI.workspace.fs.readFile(fileUri);
      const content = new TextDecoder().decode(fileContentUint8Array);
      
      return { success: true, data: { filePath: fileUri.fsPath, content } };
    } catch (error: any) {
      context?.dispatcher?.systemError('Error executing getFileContents', error, 
        { toolName: 'getFileContents', params, chatId: context.chatId }
      );
      return { success: false, error: `Failed to get file contents for "${path}": ${error.message}` };
    }
  }
};