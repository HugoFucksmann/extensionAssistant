// src/features/tools/definitions/filesystem/createFileOrDirectory.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult,  } from '../../types';
import { buildWorkspaceUri } from '@shared/utils/pathUtils';


// Esquema Zod para los parámetros
export const createFileOrDirectoryParamsSchema = z.object({
  path: z.string().min(1, { message: "Path cannot be empty." }),
  type: z.enum(['file', 'directory']).describe("Specify 'file' to create a file (optionally with content) or 'directory' to create a directory."),
  content: z.string().optional().describe("Content for the file. Only used if type is 'file'. If type is 'file' and content is omitted, an empty file is created.")
}).strict() 
.refine(data => {
    if (data.type === 'directory' && data.content !== undefined) {
        return false;
    }
    return true;
}, {
    message: "Content should not be provided when creating a directory. For files, content is optional.",
    path: ['content']
});


type CreateResultType = { 
  path: string; 
  type: 'file' | 'directory'; 
  operation: 'created' | 'overwritten' | 'exists';
  absolutePath: string;
  size?: number;
  encoding: string;
  mimeType?: string;
  lastModified: string;
  parentDirectory: string;
  children?: string[]; // Para directorios
};

export const createFileOrDirectory: ToolDefinition<typeof createFileOrDirectoryParamsSchema, CreateResultType> = {
  getUIDescription: (params) => `Crear ${params?.type || 'ítem'}: ${params?.path?.split(/[\\/]/).pop() || 'archivo'}`,
  uiFeedback: true,
  mapToOutput: (rawData, success, errorMsg) => success ? {
    title: rawData.type === 'file' ? 'Archivo creado' : 'Directorio creado',
    summary: `${rawData.type === 'file' ? 'Archivo' : 'Directorio'} creado correctamente.`,
    details: `Ruta: ${rawData.path}\nTipo: ${rawData.type}\nOperación: ${rawData.operation}`,
    items: [],
    meta: {
      path: rawData.path,
      type: rawData.type,
      operation: rawData.operation,
      absolutePath: rawData.absolutePath
    }
  } : {
    title: 'Error al crear',
    summary: `Error: ${errorMsg || 'No se pudo crear.'}`,
    details: errorMsg,
    items: [],
    meta: {}
  },
  name: 'createFileOrDirectory',
  description: 'Creates a new file or a new directory with detailed metadata. Paths must be relative to the workspace root. Creates parent directories if they do not exist. Overwrites existing files if type is "file".',
  parametersSchema: createFileOrDirectoryParamsSchema,
  async execute(
    params, // Tipado por Zod
    context
  ): Promise<ToolResult<CreateResultType>> {
    const { path, type, content } = params;
    let targetUri: vscode.Uri | undefined;

    try {
      targetUri = buildWorkspaceUri(context.vscodeAPI, path);
      if (!targetUri) {
        return { success: false, error: 'Could not resolve path in workspace. Ensure a workspace is open and the path is valid.', data: undefined };
      }

      const parentDirUri = vscode.Uri.joinPath(targetUri, '..');
      await context.vscodeAPI.workspace.fs.createDirectory(parentDirUri); // Crea recursivamente
      
      let operation: CreateResultType['operation'] = 'created';
      let existingStat: vscode.FileStat | undefined;
      try {
        existingStat = await context.vscodeAPI.workspace.fs.stat(targetUri);
      } catch (e) { /* No existe, se creará */ }

      // Aseguramos que targetUri está definido
      const targetPath = targetUri.fsPath;
      const relativePath = context.vscodeAPI.workspace.asRelativePath(targetUri, false);
      const parentRelativePath = context.vscodeAPI.workspace.asRelativePath(parentDirUri, false);

      if (type === 'directory') {
        if (existingStat) {
          if (existingStat.type === context.vscodeAPI.FileType.Directory) {
            operation = 'exists';
            const children = await context.vscodeAPI.workspace.fs.readDirectory(targetUri);
            return { 
              success: true, 
              data: { 
                path: relativePath,
                type: 'directory', 
                operation,
                absolutePath: targetPath,
                size: 0,
                encoding: 'utf-8',
                mimeType: 'inode/directory',
                lastModified: new Date(existingStat.mtime).toISOString(),
                parentDirectory: parentRelativePath,
                children: children.map(([name, _]) => name)
              } 
            };
          } else {
            return { success: false, error: `Path ${relativePath} exists and is not a directory.`, data: undefined };
          }
        }
        await context.vscodeAPI.workspace.fs.createDirectory(targetUri);
        const stat = await context.vscodeAPI.workspace.fs.stat(targetUri);
        return { 
          success: true, 
          data: { 
            path: relativePath,
            type: 'directory', 
            operation,
            absolutePath: targetPath,
            size: 0,
            encoding: 'utf-8',
            mimeType: 'inode/directory',
            lastModified: new Date(stat.mtime).toISOString(),
            parentDirectory: parentRelativePath,
            children: []
          } 
        };
      } else { // type === 'file'
        if (existingStat) {
          if (existingStat.type === context.vscodeAPI.FileType.Directory) {
            return { success: false, error: `Path ${relativePath} exists and is a directory. Cannot overwrite with a file.`, data: undefined };
          }
          operation = 'overwritten';
        }
        await context.vscodeAPI.workspace.fs.writeFile(targetUri, new TextEncoder().encode(content || ''));
        const fileStat = await context.vscodeAPI.workspace.fs.stat(targetUri);
        return { 
          success: true, 
          data: { 
            path: relativePath,
            type: 'file', 
            operation,
            absolutePath: targetPath,
            size: fileStat.size,
            encoding: 'utf-8',
            mimeType: 'text/plain',
            lastModified: new Date(fileStat.mtime).toISOString(),
            parentDirectory: parentRelativePath
          } 
        };
      }
    } catch (error: any) {
      return { success: false, error: `Failed to create/write "${path}": ${error.message}`, data: undefined };
    }
  }
};