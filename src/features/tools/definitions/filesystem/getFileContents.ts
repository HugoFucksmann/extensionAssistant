// src/features/tools/definitions/filesystem/getFileContents.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult, ToolExecutionContext, ToolPermission } from '../../types';
import { resolveWorkspacePath } from '../utils';

// Esquema Zod para los parámetros
export const getFileContentsParamsSchema = z.object({
  path: z.string().min(1, { message: "File path cannot be empty." })
}).strict(); // No permitir parámetros extra

export const getFileContents: ToolDefinition<typeof getFileContentsParamsSchema, { filePath: string; content: string }> = {
  name: 'getFileContents',
  description: 'Gets the content of a specified file. The path must be relative to the workspace root.',
  parametersSchema: getFileContentsParamsSchema,
  requiredPermissions: ['filesystem.read'],
  async execute(
    params, // Tipado como: { path: string }
    context // Tipado como: ToolExecutionContext
  ): Promise<ToolResult<{ filePath: string; content: string }>> {
    const { path } = params;
    let fileUri: vscode.Uri | undefined;

    try {
      fileUri = resolveWorkspacePath(context.vscodeAPI, path);
      if (!fileUri) {
        return { success: false, error: 'Could not resolve path in workspace. Ensure a workspace is open and the path is valid.' };
      }

      // Verificar existencia primero
      try {
        await context.vscodeAPI.workspace.fs.stat(fileUri);
      } catch (e) {
        // Log específico de la herramienta si es necesario, usando context.dispatcher
        // context.dispatcher.systemWarning(`File not found at ${fileUri.fsPath} for getFileContents`, { toolName: 'getFileContents', path }, context.chatId);
        return { success: false, error: `File not found or not accessible: ${context.vscodeAPI.workspace.asRelativePath(fileUri, false)}` };
      }

      const fileContentUint8Array = await context.vscodeAPI.workspace.fs.readFile(fileUri);
      const content = new TextDecoder().decode(fileContentUint8Array);
      
      return { success: true, data: { filePath: context.vscodeAPI.workspace.asRelativePath(fileUri, false), content } };
    } catch (error: any) {
      // El ToolRegistry se encarga del log y evento TOOL_EXECUTION_ERROR genérico.
      // Aquí solo retornamos el error específico de la herramienta.
      return { success: false, error: `Failed to get file contents for "${path}": ${error.message}` };
    }
  }
};