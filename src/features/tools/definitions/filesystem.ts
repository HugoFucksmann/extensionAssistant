// src/features/tools/definitions/filesystem.ts
import * as vscode from 'vscode'; // Importar vscode directamente según tu preferencia
import * as path from 'path';
import { ToolDefinition, ToolResult, ParameterDefinition, ToolExecutionContext, ToolPermission } from '../types';

// --- Herramientas Existentes (Modificadas para usar vscodeAPI si se pasa, o el importado) ---

const filePathParam: ParameterDefinition = {
  type: 'string',
  description: 'Path to the file, can be relative to workspace or absolute.',
  required: true
};

const relativeToParam: ParameterDefinition = {
  type: 'string',
  description: 'Specifies if the path is relative to "workspace" or "absolute".',
  enum: ['workspace', 'absolute'],
  default: 'workspace'
};

export const getFileContents: ToolDefinition = {
  name: 'getFileContents',
  description: 'Gets the content of a file.',
  parameters: {
    filePath: filePathParam,
    relativeTo: relativeToParam
  },
  requiredPermissions: ['filesystem.read'],
  async execute(
    params: { filePath: string; relativeTo?: 'workspace' | 'absolute' }, 
    context?: ToolExecutionContext
  ): Promise<ToolResult<{ content: string; path: string }>> {
    const vscodeInstance = context?.vscodeAPI || vscode; // Usar del contexto o el importado

    try {
      const { filePath, relativeTo = 'workspace' } = params;
      let fileUri: vscode.Uri;

      if (relativeTo === 'workspace') {
        const workspaceFolderUri = vscodeInstance.workspace.workspaceFolders?.[0]?.uri;
        if (!workspaceFolderUri) {
          throw new Error('No workspace folder found to resolve relative path.');
        }
        fileUri = vscodeInstance.Uri.joinPath(workspaceFolderUri, filePath);
      } else {
        fileUri = vscodeInstance.Uri.file(filePath); // Asumir que es un path absoluto del sistema de archivos
      }
      
      // Verificar existencia primero es una buena práctica antes de leer
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
  parameters: {
    filePath: filePathParam,
    content: { type: 'string', description: 'Content to write to the file.', required: true },
    relativeTo: relativeToParam,
    overwrite: { type: 'boolean', description: 'Overwrite if file exists.', default: false, required: false }
    // createIfNotExists es implícito ahora, ya que writeFile lo hará.
  },
  requiredPermissions: ['filesystem.write'],
  async execute(
    params: { filePath: string; content: string; relativeTo?: 'workspace' | 'absolute'; overwrite?: boolean },
    context?: ToolExecutionContext
  ): Promise<ToolResult<{ path: string }>> {
    const vscodeInstance = context?.vscodeAPI || vscode;
    const { filePath, content, relativeTo = 'workspace', overwrite = false } = params;

    try {
        let targetUri: vscode.Uri;
        if (relativeTo === 'workspace') {
            const workspaceFolderUri = vscodeInstance.workspace.workspaceFolders?.[0]?.uri;
            if (!workspaceFolderUri) throw new Error('No workspace folder found.');
            targetUri = vscodeInstance.Uri.joinPath(workspaceFolderUri, filePath);
        } else {
            targetUri = vscodeInstance.Uri.file(filePath);
        }

        // Verificar si el archivo existe si no se permite sobrescribir
        if (!overwrite) {
            try {
                await vscodeInstance.workspace.fs.stat(targetUri);
                // Si stat tiene éxito, el archivo existe
                return { success: false, error: `File ${targetUri.fsPath} already exists and overwrite is false.` };
            } catch (e) {
                // El archivo no existe, continuar.
            }
        }
        
        // Asegurar que el directorio padre exista
        const dirUri = vscodeInstance.Uri.joinPath(targetUri, '..');
        try {
            await vscodeInstance.workspace.fs.stat(dirUri);
        } catch (e) { // Directorio no existe
            await vscodeInstance.workspace.fs.createDirectory(dirUri); // Crear recursivamente
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
  parameters: {
    dirPath: { type: 'string', description: 'Directory path to list, relative to workspace or absolute.', default: '.', required: false },
    relativeTo: relativeToParam,
    includePattern: { type: 'string', description: 'Glob pattern for files/folders to include (e.g., **/*.ts).', default: '**/*', required: false },
    excludePattern: { type: 'string', description: 'Glob pattern for files/folders to exclude (e.g., node_modules/**).', required: false },
    // recursive es implícito en los patrones glob como '**'
    maxResults: { type: 'number', description: 'Maximum number of results to return.', default: 1000, required: false }
  },
  requiredPermissions: ['filesystem.read'],
  async execute(
    params: { dirPath?: string; relativeTo?: 'workspace' | 'absolute'; includePattern?: string; excludePattern?: string; maxResults?: number },
    context?: ToolExecutionContext
  ): Promise<ToolResult<{ files: Array<{ path: string; type: 'file' | 'directory' | 'unknown' }> }>> {
    const vscodeInstance = context?.vscodeAPI || vscode;
    const { dirPath = '.', relativeTo = 'workspace', includePattern = '**/*', excludePattern, maxResults = 1000 } = params;

    try {
        let baseSearchPath: string;
        const workspaceFolder = vscodeInstance.workspace.workspaceFolders?.[0];

        if (relativeTo === 'workspace') {
            if (!workspaceFolder) throw new Error('No workspace folder found for relative search.');
            // Para findFiles, el patrón debe ser relativo al workspace si dirPath es parte del patrón
            baseSearchPath = path.join(dirPath, includePattern).replace(/\\/g, '/'); // Normalizar a slashes
        } else {
            // Si es absoluto, el includePattern debe ser un path absoluto o findFiles no funcionará como se espera
            // Esto es complicado con findFiles. Es más fácil si dirPath es absoluto y el patrón es relativo a él.
            // Por ahora, asumimos que si relativeTo es 'absolute', dirPath es el punto de partida y el patrón es desde ahí.
            // Esto podría necesitar una implementación más robusta con readDirectory y glob matching manual si findFiles no es flexible.
            // Para simplificar, si dirPath es absoluto, el patrón se considera desde la raíz del FS.
            // Una mejor aproximación sería usar readDirectory para dirPath y luego filtrar.
            // Por ahora, vamos con findFiles y el usuario debe entender cómo funciona.
            baseSearchPath = path.isAbsolute(dirPath) ? path.join(dirPath, includePattern).replace(/\\/g, '/') : includePattern;
        }
        
        const foundUris = await vscodeInstance.workspace.findFiles(baseSearchPath, excludePattern, maxResults);
        
        const files = await Promise.all(foundUris.map(async uri => {
            let fileType: 'file' | 'directory' | 'unknown' = 'unknown';
            try {
                const stat = await vscodeInstance.workspace.fs.stat(uri);
                if (stat.type === vscodeInstance.FileType.File) fileType = 'file';
                else if (stat.type === vscodeInstance.FileType.Directory) fileType = 'directory';
            } catch (e) { /* ignorar error de stat, se queda como unknown */ }
            return { path: uri.fsPath, type: fileType };
        }));

        return { success: true, data: { files } };
    } catch (error: any) {
        return { success: false, error: `Failed to list files: ${error.message}` };
    }
  }
};


// --- NUEVAS HERRAMIENTAS (antes en filesystemExtended.ts) ---

export const createFileOrDirectory: ToolDefinition = {
  name: 'createFileOrDirectory',
  description: 'Creates a new file (optionally with content) or a new directory. Fails if the target already exists, unless overwrite is true for files.',
  parameters: {
    path: { type: 'string', description: 'Path relative to workspace or absolute.', required: true },
    type: { type: 'string', description: 'Type to create.', enum: ['file', 'directory'], required: true },
    content: { type: 'string', description: 'Initial content if type is "file".', required: false },
    overwrite: { type: 'boolean', description: 'Overwrite if file exists (only applies to files).', default: false, required: false },
  },
  requiredPermissions: ['filesystem.write'],
  async execute(
    params: { path: string; type: 'file' | 'directory'; content?: string; overwrite?: boolean }, 
    context?: ToolExecutionContext
  ): Promise<ToolResult> {
    const vscodeInstance = context?.vscodeAPI || vscode;
    const { path: targetPath, type, content = '', overwrite = false } = params;
    
    const workspaceFolderUri = vscodeInstance.workspace.workspaceFolders?.[0]?.uri;
    // Permitir creación fuera del workspace si el path es absoluto y el usuario tiene permisos del OS
    // if (!workspaceFolderUri && !path.isAbsolute(targetPath)) {
    //     return { success: false, error: 'No workspace folder found and path is not absolute.' };
    // }

    const uri = path.isAbsolute(targetPath) 
        ? vscodeInstance.Uri.file(targetPath) 
        : workspaceFolderUri 
            ? vscodeInstance.Uri.joinPath(workspaceFolderUri, targetPath)
            : vscodeInstance.Uri.file(targetPath); // Fallback a absoluto si no hay workspace pero se intentó relativo

    try {
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
        // Asegurar que el directorio padre exista
        const dirUri = vscodeInstance.Uri.joinPath(uri, '..');
        try { await vscodeInstance.workspace.fs.stat(dirUri); } 
        catch (e) { await vscodeInstance.workspace.fs.createDirectory(dirUri); }

        await vscodeInstance.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
        return { success: true, data: { path: uri.fsPath, message: `File ${uri.fsPath} ${targetExists ? 'overwritten' : 'created'}.` } };
      } else if (type === 'directory') {
        if (targetExists) {
          return { success: false, error: `Directory ${uri.fsPath} already exists.` };
        }
        await vscodeInstance.workspace.fs.createDirectory(uri); // createDirectory es recursivo por defecto
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
  parameters: {
    path: { type: 'string', description: 'Path to delete, relative to workspace or absolute.', required: true },
    recursive: { type: 'boolean', description: 'Delete recursively (required for non-empty directories).', default: false, required: false },
    useTrash: { type: 'boolean', description: 'Move to trash instead of permanent delete.', default: true, required: false },
  },
  requiredPermissions: ['filesystem.write'],
  async execute(
    params: { path: string; recursive?: boolean; useTrash?: boolean }, 
    context?: ToolExecutionContext
  ): Promise<ToolResult> {
    const vscodeInstance = context?.vscodeAPI || vscode;
    const { path: targetPath, recursive = false, useTrash = true } = params;
    
    const workspaceFolderUri = vscodeInstance.workspace.workspaceFolders?.[0]?.uri;
    // if (!workspaceFolderUri && !path.isAbsolute(targetPath)) {
    //     return { success: false, error: 'No workspace folder found and path is not absolute.' };
    // }

    const uri = path.isAbsolute(targetPath) 
        ? vscodeInstance.Uri.file(targetPath) 
        : workspaceFolderUri
            ? vscodeInstance.Uri.joinPath(workspaceFolderUri, targetPath)
            : vscodeInstance.Uri.file(targetPath);

    try {
      // Verificar si existe antes de intentar borrar para dar un error más claro
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