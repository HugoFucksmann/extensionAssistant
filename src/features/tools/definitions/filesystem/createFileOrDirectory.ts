// src/features/tools/definitions/filesystem/createFileOrDirectory.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult, ToolExecutionContext, ToolPermission } from '../../types';
import { resolveWorkspacePath } from '../utils';

// Esquema Zod para los parámetros
export const createFileOrDirectoryParamsSchema = z.object({
  path: z.string().min(1, { message: "Path cannot be empty." }),
  type: z.enum(['file', 'directory']).describe("Specify 'file' to create a file (optionally with content) or 'directory' to create a directory."),
  content: z.string().optional().describe("Content for the file. Only used if type is 'file'. If type is 'file' and content is omitted, an empty file is created.")
}).strict() // Move strict() here
.refine(data => {
    if (data.type === 'directory' && data.content !== undefined) {
        return false;
    }
    return true;
}, {
    message: "Content should not be provided when creating a directory. For files, content is optional.",
    path: ['content']
});


type CreateResultType = { path: string; type: 'file' | 'directory'; operation: 'created' | 'overwritten' | 'exists' };

export const createFileOrDirectory: ToolDefinition<typeof createFileOrDirectoryParamsSchema, CreateResultType> = {
  name: 'createFileOrDirectory',
  description: 'Creates a new file or a new directory. Paths must be relative to the workspace root. Creates parent directories if they do not exist. Overwrites existing files if type is "file".',
  parametersSchema: createFileOrDirectoryParamsSchema,
  async execute(
    params, // Tipado por Zod
    context
  ): Promise<ToolResult<CreateResultType>> {
    const { path, type, content } = params;
    let targetUri: vscode.Uri | undefined;

    try {
      targetUri = resolveWorkspacePath(context.vscodeAPI, path);
      if (!targetUri) {
        return { success: false, error: 'Could not resolve path in workspace. Ensure a workspace is open and the path is valid.' };
      }

      const parentDirUri = vscode.Uri.joinPath(targetUri, '..');
      await context.vscodeAPI.workspace.fs.createDirectory(parentDirUri); // Crea recursivamente
      
      let operation: CreateResultType['operation'] = 'created';
      let existingStat: vscode.FileStat | undefined;
      try {
        existingStat = await context.vscodeAPI.workspace.fs.stat(targetUri);
      } catch (e) { /* No existe, se creará */ }

      if (type === 'directory') {
        if (existingStat) {
          if (existingStat.type === context.vscodeAPI.FileType.Directory) {
            operation = 'exists';
            return { success: true, data: { path: context.vscodeAPI.workspace.asRelativePath(targetUri, false), type: 'directory', operation } };
          } else {
            return { success: false, error: `Path ${context.vscodeAPI.workspace.asRelativePath(targetUri, false)} exists and is not a directory.` };
          }
        }
        await context.vscodeAPI.workspace.fs.createDirectory(targetUri);
        return { success: true, data: { path: context.vscodeAPI.workspace.asRelativePath(targetUri, false), type: 'directory', operation } };
      } else { // type === 'file'
        if (existingStat) {
          if (existingStat.type === context.vscodeAPI.FileType.Directory) {
            return { success: false, error: `Path ${context.vscodeAPI.workspace.asRelativePath(targetUri, false)} exists and is a directory. Cannot overwrite with a file.` };
          }
          operation = 'overwritten';
        }
        await context.vscodeAPI.workspace.fs.writeFile(targetUri, new TextEncoder().encode(content || ''));
        return { success: true, data: { path: context.vscodeAPI.workspace.asRelativePath(targetUri, false), type: 'file', operation } };
      }
    } catch (error: any) {
      return { success: false, error: `Failed to create/write "${path}": ${error.message}` };
    }
  }
};