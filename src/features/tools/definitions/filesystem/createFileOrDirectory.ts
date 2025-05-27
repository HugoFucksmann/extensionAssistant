// src/features/tools/definitions/filesystem/createFileOrDirectory.ts
import * as vscode from 'vscode';
import { ToolDefinition, ToolPermission, ToolResult, ToolExecutionContext } from '../../types';
import { resolveWorkspacePath } from '../utils'; // Utilidad para resolver paths

export const createFileOrDirectory: ToolDefinition = {
  name: 'createFileOrDirectory',
  description: 'Creates a new file or directory. If content is provided, a file is created. If content is empty or omitted, a directory is created. Assumes path is relative to the workspace root. Overwrites existing files if content is provided and it\'s a file.',
  parameters: {
    path: { type: 'string', description: 'Workspace-relative path for the new file or directory.', required: true },
    content: { type: 'string', description: 'Content for the file. If omitted or empty, a directory will be created.', required: false, default: undefined } // default: undefined para distinguirlo de string vacío
  },
  requiredPermissions: ['filesystem.write'],
  async execute(
    params: { path: string; content?: string },
    context?: ToolExecutionContext
  ): Promise<ToolResult<{ path: string; type: 'file' | 'directory'; operation: 'created' | 'overwritten' | 'exists' }>> {
    if (!context?.vscodeAPI) {
      return { success: false, error: 'VSCode API context not available.' };
    }
    const { path, content } = params; // content puede ser undefined aquí
    let targetUri: vscode.Uri | undefined;

    try {
      targetUri = resolveWorkspacePath(context.vscodeAPI, path);
      if (!targetUri) {
        return { success: false, error: 'Could not resolve path in workspace. No workspace folder open or path is invalid.' };
      }

      const createAsDirectory = content === undefined; // Si no se provee content, es directorio

      // Asegurar que el directorio padre exista (createDirectory es recursivo por defecto)
      const parentDirUri = vscode.Uri.joinPath(targetUri, '..');
      try {
          await context.vscodeAPI.workspace.fs.stat(parentDirUri);
      } catch (e) { // Directorio padre no existe
          await context.vscodeAPI.workspace.fs.createDirectory(parentDirUri);
      }
      
      let operation: 'created' | 'overwritten' | 'exists' = 'created';
      let targetExists = false;
      let existingStat: vscode.FileStat | undefined;

      try {
        existingStat = await context.vscodeAPI.workspace.fs.stat(targetUri);
        targetExists = true;
      } catch (e) {
        targetExists = false;
      }

      if (createAsDirectory) {
        if (targetExists) {
          if (existingStat?.type === context.vscodeAPI.FileType.Directory) {
            operation = 'exists';
            return { success: true, data: { path: targetUri.fsPath, type: 'directory', operation } };
          } else {
            return { success: false, error: `Path ${targetUri.fsPath} exists and is not a directory.` };
          }
        }
        await context.vscodeAPI.workspace.fs.createDirectory(targetUri);
        return { success: true, data: { path: targetUri.fsPath, type: 'directory', operation } };
      } else { // Crear/Escribir archivo
        if (targetExists) {
          if (existingStat?.type === context.vscodeAPI.FileType.Directory) {
            return { success: false, error: `Path ${targetUri.fsPath} exists and is a directory. Cannot overwrite with a file.` };
          }
          operation = 'overwritten'; // Sobrescribir si es archivo
        }
        await context.vscodeAPI.workspace.fs.writeFile(targetUri, new TextEncoder().encode(content || '')); // content puede ser string vacío
        return { success: true, data: { path: targetUri.fsPath, type: 'file', operation } };
      }
    } catch (error: any) {
      context?.dispatcher?.systemError('Error executing createFileOrDirectory', error, 
        { toolName: 'createFileOrDirectory', params: {path: params.path, content: params.content ? params.content.substring(0,100) + '...' : undefined}, chatId: context.chatId }
      );
      return { success: false, error: `Failed to create/write "${path}": ${error.message}` };
    }
  }
};