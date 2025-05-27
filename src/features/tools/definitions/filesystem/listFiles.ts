// src/features/tools/definitions/filesystem/listFiles.ts
import * as vscode from 'vscode';
import { ToolDefinition, ToolPermission, ToolResult, ToolExecutionContext } from '../../types';

export const listFiles: ToolDefinition = {
  name: 'listFiles',
  description: 'Lists files and directories matching a glob pattern within the workspace. Defaults to listing all files, respecting .gitignore and files.exclude settings.',
  parameters: {
    pattern: { type: 'string', description: 'Glob pattern (e.g., "src/**/*.ts", "docs/*.md"). Defaults to "**/*" for all files.', default: '**/*', required: false }
    // maxResults: { type: 'number', description: 'Maximum number of results to return.', default: 1000, required: false } // Opcional, para evitar respuestas muy grandes
  },
  requiredPermissions: ['filesystem.read'],
  async execute(
    params: { pattern?: string; maxResults?: number },
    context?: ToolExecutionContext
  ): Promise<ToolResult<{ files: Array<{ path: string; type: 'file' | 'directory' | 'symbolicLink' | 'unknown' }> }>> {
    if (!context?.vscodeAPI) {
      return { success: false, error: 'VSCode API context not available.' };
    }
    const { pattern = '**/*', maxResults = 1000 } = params; // maxResults con valor por defecto
    const workspaceFolder = context.vscodeAPI.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
        return { success: false, error: 'No workspace folder open to list files from.' };
    }

    try {
      // vscode.workspace.findFiles ya respeta .gitignore y files.exclude por defecto
      // El patrón debe ser relativo al workspaceFolder
      const relativePattern = new context.vscodeAPI.RelativePattern(workspaceFolder, pattern);
      const foundUris = await context.vscodeAPI.workspace.findFiles(relativePattern, null, maxResults);
      
      const files = await Promise.all(foundUris.map(async uri => {
        let fileType: 'file' | 'directory' | 'symbolicLink' | 'unknown' = 'unknown';
        try {
          const stat = await context.vscodeAPI.workspace.fs.stat(uri);
          if (stat.type === context.vscodeAPI.FileType.File) fileType = 'file';
          else if (stat.type === context.vscodeAPI.FileType.Directory) fileType = 'directory';
          else if (stat.type === context.vscodeAPI.FileType.SymbolicLink) fileType = 'symbolicLink';
        } catch (e) { /* ignorar error de stat, se queda como unknown */ }
        return { path: context.vscodeAPI.workspace.asRelativePath(uri, false), type: fileType }; // Devolver path relativo
      }));

      return { success: true, data: { files } };
    } catch (error: any) {
      context?.dispatcher?.systemError('Error executing listFiles', error, 
        { toolName: 'listFiles', params, chatId: context.chatId }
      );
      return { success: false, error: `Failed to list files with pattern "${pattern}": ${error.message}` };
    }
  }
};