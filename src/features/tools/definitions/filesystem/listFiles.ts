// src/features/tools/definitions/filesystem/listFiles.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult, ToolExecutionContext, ToolPermission } from '../../types';

// Esquema Zod para los parámetros
export const listFilesParamsSchema = z.object({
  pattern: z.string().optional().default('**/*').describe('Glob pattern (e.g., "src/**/*.ts"). Defaults to all files in the workspace, respecting .gitignore and files.exclude settings.'),
  // maxResults: z.number().int().positive().optional().default(1000) // Podríamos añadirlo si es muy necesario
}).strict();

type ListedFile = { path: string; type: 'file' | 'directory' | 'symbolicLink' | 'unknown' };

export const listFiles: ToolDefinition<typeof listFilesParamsSchema, { files: ListedFile[] }> = {
  name: 'listFiles',
  description: 'Lists files and directories matching a glob pattern within the current workspace. Respects .gitignore and files.exclude settings.',
  parametersSchema: listFilesParamsSchema,
  requiredPermissions: ['filesystem.read'], // Aunque usa findFiles, conceptualmente es una lectura del sistema de archivos
  async execute(
    params, // Tipado como: { pattern?: string }
    context
  ): Promise<ToolResult<{ files: ListedFile[] }>> {
    const { pattern } = params; // pattern tendrá el valor por defecto si no se provee
    const maxResults = 1000; // Hardcodeado por ahora para simplicidad, podría ser un param

    const workspaceFolder = context.vscodeAPI.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return { success: false, error: 'No workspace folder open to list files from.' };
    }

    try {
      const relativePattern = new context.vscodeAPI.RelativePattern(workspaceFolder, pattern!); // pattern! es seguro por el default
      const foundUris = await context.vscodeAPI.workspace.findFiles(relativePattern, null, maxResults);
      
      const filesPromises = foundUris.map(async (uri): Promise<ListedFile> => {
        let fileType: ListedFile['type'] = 'unknown';
        try {
          const stat = await context.vscodeAPI.workspace.fs.stat(uri);
          if (stat.type === context.vscodeAPI.FileType.File) fileType = 'file';
          else if (stat.type === context.vscodeAPI.FileType.Directory) fileType = 'directory';
          else if (stat.type === context.vscodeAPI.FileType.SymbolicLink) fileType = 'symbolicLink';
        } catch (e) { /* ignorar error de stat, se queda como unknown */ }
        return { path: context.vscodeAPI.workspace.asRelativePath(uri, false), type: fileType };
      });

      const files = await Promise.all(filesPromises);
      return { success: true, data: { files } };
    } catch (error: any) {
      return { success: false, error: `Failed to list files with pattern "${pattern}": ${error.message}` };
    }
  }
};