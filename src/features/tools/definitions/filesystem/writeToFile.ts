// src/features/tools/definitions/filesystem/writeToFile.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult,  } from '../../types';
import { resolveWorkspacePath } from '../utils';

// Esquema Zod para los parámetros
export const writeToFileParamsSchema = z.object({
  path: z.string().min(1, { message: "File path cannot be empty." }),
  content: z.string() 
}).strict();

export const writeToFile: ToolDefinition<typeof writeToFileParamsSchema, { filePath: string }> = {
  name: 'writeToFile',
  description: 'Writes or overwrites content to a specified file. Creates parent directories if they do not exist. The path must be relative to the workspace root.',
  parametersSchema: writeToFileParamsSchema,
  async execute(
    params, // Tipado como: { path: string; content: string }
    context
  ): Promise<ToolResult<{ filePath: string }>> {
    const { path, content } = params;
    let targetUri: vscode.Uri | undefined;

    try {
      targetUri = resolveWorkspacePath(context.vscodeAPI, path);
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