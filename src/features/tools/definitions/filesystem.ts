// src/features/tools/definitions/filesystem.ts
// ... (imports existentes)
import { ToolDefinition, ToolResult, ParameterDefinition, ToolExecutionContext, ToolPermission } from '../types';
// NO importaremos 'vscode' aquí si siempre lo obtenemos del contexto

// ... (definiciones de filePathParam, relativeToParam sin cambios)

export const getFileContents: ToolDefinition = {
  name: 'getFileContents',
  description: 'Gets the content of a file.',
  parameters: { /*...*/ },
  requiredPermissions: ['filesystem.read'],
  async execute(
    params: { filePath: string; relativeTo?: 'workspace' | 'absolute' },
    context?: ToolExecutionContext // Asegurarse que el contexto es opcional pero esperado
  ): Promise<ToolResult<{ content: string; path: string }>> {
    if (!context?.vscodeAPI) { // COMPROBACIÓN CLAVE
      return { success: false, error: 'VSCode API context not available for getFileContents.' };
    }
    const vscodeInstance = context.vscodeAPI; // Usar del contexto

    try {
      const { filePath, relativeTo = 'workspace' } = params;
      let fileUri: import('vscode').Uri; // Usar el tipo de vscodeInstance

      if (relativeTo === 'workspace') {
        const workspaceFolderUri = vscodeInstance.workspace.workspaceFolders?.[0]?.uri;
        if (!workspaceFolderUri) {
          throw new Error('No workspace folder found to resolve relative path.');
        }
        fileUri = vscodeInstance.Uri.joinPath(workspaceFolderUri, filePath);
      } else {
        fileUri = vscodeInstance.Uri.file(filePath);
      }

      try {
        await vscodeInstance.workspace.fs.stat(fileUri);
      } catch (e) {
        return { success: false, error: `File not found or not accessible: ${fileUri.fsPath}` };
      }

      const fileContentUint8Array = await vscodeInstance.workspace.fs.readFile(fileUri);
      const content = new TextDecoder().decode(fileContentUint8Array);

      return { success: true, data: { content, path: fileUri.fsPath } };
    } catch (error: any) {
      return { success: false, error: `Failed to get file contents: ${error.message}` };
    }
  }
};

export const writeToFile: ToolDefinition = {
  name: 'writeToFile',
  description: 'Writes content to a file, creating directories if necessary. Can overwrite existing files.',
  parameters: { /*...*/ },
  requiredPermissions: ['filesystem.write'],
  async execute(
    params: { filePath: string; content: string; relativeTo?: 'workspace' | 'absolute'; overwrite?: boolean },
    context?: ToolExecutionContext
  ): Promise<ToolResult<{ path: string }>> {
    if (!context?.vscodeAPI) { // COMPROBACIÓN CLAVE
      return { success: false, error: 'VSCode API context not available for writeToFile.' };
    }
    const vscodeInstance = context.vscodeAPI;
    const { filePath, content, relativeTo = 'workspace', overwrite = false } = params;

    try {
        let targetUri: import('vscode').Uri;
        if (relativeTo === 'workspace') {
            const workspaceFolderUri = vscodeInstance.workspace.workspaceFolders?.[0]?.uri;
            if (!workspaceFolderUri) throw new Error('No workspace folder found.');
            targetUri = vscodeInstance.Uri.joinPath(workspaceFolderUri, filePath);
        } else {
            targetUri = vscodeInstance.Uri.file(filePath);
        }

        if (!overwrite) {
            try {
                await vscodeInstance.workspace.fs.stat(targetUri);
                return { success: false, error: `File ${targetUri.fsPath} already exists and overwrite is false.` };
            } catch (e) { /* El archivo no existe, continuar. */ }
        }

        const dirUri = vscodeInstance.Uri.joinPath(targetUri, '..');
        try {
            await vscodeInstance.workspace.fs.stat(dirUri);
        } catch (e) {
            await vscodeInstance.workspace.fs.createDirectory(dirUri);
        }

        await vscodeInstance.workspace.fs.writeFile(targetUri, new TextEncoder().encode(content));
        return { success: true, data: { path: targetUri.fsPath } };

    } catch (error: any) {
        return { success: false, error: `Failed to write to file: ${error.message}` };
    }
  }
};

export const listFiles: ToolDefinition = {
  name: 'listFiles',
  description: 'Lists files and directories within a specified path. Uses glob patterns for filtering.',
  parameters: { /*...*/ },
  requiredPermissions: ['filesystem.read'],
  async execute(
    params: { dirPath?: string; relativeTo?: 'workspace' | 'absolute'; includePattern?: string; excludePattern?: string; maxResults?: number },
    context?: ToolExecutionContext
  ): Promise<ToolResult<{ files: Array<{ path: string; type: 'file' | 'directory' | 'unknown' }> }>> {
    if (!context?.vscodeAPI) { // COMPROBACIÓN CLAVE
      return { success: false, error: 'VSCode API context not available for listFiles.' };
    }
    const vscodeInstance = context.vscodeAPI;
    const { dirPath = '.', relativeTo = 'workspace', includePattern = '**/*', excludePattern, maxResults = 1000 } = params;
     // path se importa de 'path', no de vscodeInstance
    const path = require('path');


    try {
        let baseSearchPath: string;
        const workspaceFolder = vscodeInstance.workspace.workspaceFolders?.[0];

        if (relativeTo === 'workspace') {
            if (!workspaceFolder) throw new Error('No workspace folder found for relative search.');
            baseSearchPath = path.join(dirPath, includePattern).replace(/\\/g, '/');
        } else {
            baseSearchPath = path.isAbsolute(dirPath) ? path.join(dirPath, includePattern).replace(/\\/g, '/') : includePattern;
        }

        const foundUris = await vscodeInstance.workspace.findFiles(baseSearchPath, excludePattern, maxResults);

        const files = await Promise.all(foundUris.map(async uri => {
            let fileType: 'file' | 'directory' | 'unknown' = 'unknown';
            try {
                const stat = await vscodeInstance.workspace.fs.stat(uri);
                if (stat.type === vscodeInstance.FileType.File) fileType = 'file';
                else if (stat.type === vscodeInstance.FileType.Directory) fileType = 'directory';
            } catch (e) { /* ignorar error de stat */ }
            return { path: uri.fsPath, type: fileType };
        }));

        return { success: true, data: { files } };
    } catch (error: any) {
        return { success: false, error: `Failed to list files: ${error.message}` };
    }
  }
};

// Para createFileOrDirectory y deleteFileOrDirectory (que ya estaban en filesystem.ts)
export const createFileOrDirectory: ToolDefinition = {
  name: 'createFileOrDirectory',
  description: 'Creates a new file (optionally with content) or a new directory. Fails if the target already exists, unless overwrite is true for files.',
  parameters: { /*...*/ },
  requiredPermissions: ['filesystem.write'],
  async execute(
    params: { path: string; type: 'file' | 'directory'; content?: string; overwrite?: boolean },
    context?: ToolExecutionContext
  ): Promise<ToolResult> {
    if (!context?.vscodeAPI) { // COMPROBACIÓN CLAVE
      return { success: false, error: 'VSCode API context not available for createFileOrDirectory.' };
    }
    const vscodeInstance = context.vscodeAPI;
    const { path: targetPath, type, content = '', overwrite = false } = params;
    const path = require('path'); // path se importa de 'path'

    const workspaceFolderUri = vscodeInstance.workspace.workspaceFolders?.[0]?.uri;
    const uri = path.isAbsolute(targetPath)
        ? vscodeInstance.Uri.file(targetPath)
        : workspaceFolderUri
            ? vscodeInstance.Uri.joinPath(workspaceFolderUri, targetPath)
            : vscodeInstance.Uri.file(targetPath); // Fallback a absoluto

    try {
      // ... (lógica existente, ya usa vscodeInstance)
      let targetExists = false;
      try {
        await vscodeInstance.workspace.fs.stat(uri);
        targetExists = true;
      } catch (e) {
        targetExists = false;
      }

      if (type === 'file') {
        if (targetExists && !overwrite) {
          return { success: false, error: `File ${uri.fsPath} already exists and overwrite is false.` };
        }
        const dirUri = vscodeInstance.Uri.joinPath(uri, '..');
        try { await vscodeInstance.workspace.fs.stat(dirUri); }
        catch (e) { await vscodeInstance.workspace.fs.createDirectory(dirUri); }

        await vscodeInstance.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
        return { success: true, data: { path: uri.fsPath, message: `File ${uri.fsPath} ${targetExists ? 'overwritten' : 'created'}.` } };
      } else if (type === 'directory') {
        if (targetExists) {
          return { success: false, error: `Directory ${uri.fsPath} already exists.` };
        }
        await vscodeInstance.workspace.fs.createDirectory(uri);
        return { success: true, data: { path: uri.fsPath, message: `Directory ${uri.fsPath} created.` } };
      } else {
        return { success: false, error: 'Invalid type specified. Must be "file" or "directory".' };
      }
    } catch (error: any) {
      return { success: false, error: `Failed to ${type === 'file' ? 'create file' : 'create directory'} ${uri.fsPath}: ${error.message}` };
    }
  }
};

export const deleteFileOrDirectory: ToolDefinition = {
  name: 'deleteFileOrDirectory',
  description: 'Deletes a file or directory. Use recursive for non-empty directories.',
  parameters: { /*...*/ },
  requiredPermissions: ['filesystem.write'],
  async execute(
    params: { path: string; recursive?: boolean; useTrash?: boolean },
    context?: ToolExecutionContext
  ): Promise<ToolResult> {
    if (!context?.vscodeAPI) { // COMPROBACIÓN CLAVE
      return { success: false, error: 'VSCode API context not available for deleteFileOrDirectory.' };
    }
    const vscodeInstance = context.vscodeAPI;
    const { path: targetPath, recursive = false, useTrash = true } = params;
    const path = require('path'); // path se importa de 'path'

    const workspaceFolderUri = vscodeInstance.workspace.workspaceFolders?.[0]?.uri;
    const uri = path.isAbsolute(targetPath)
        ? vscodeInstance.Uri.file(targetPath)
        : workspaceFolderUri
            ? vscodeInstance.Uri.joinPath(workspaceFolderUri, targetPath)
            : vscodeInstance.Uri.file(targetPath);

    try {
      // ... (lógica existente, ya usa vscodeInstance)
      try {
        await vscodeInstance.workspace.fs.stat(uri);
      } catch (e) {
        return { success: false, error: `Path not found: ${uri.fsPath}` };
      }
      await vscodeInstance.workspace.fs.delete(uri, { recursive, useTrash });
      return { success: true, data: { path: uri.fsPath, message: `Path ${uri.fsPath} deleted.` } };
    } catch (error: any) {
      return { success: false, error: `Failed to delete ${uri.fsPath}: ${error.message}` };
    }
  }
};