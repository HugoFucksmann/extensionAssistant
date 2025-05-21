import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseTool } from '../baseTool';
import { FileSystemParams, ToolResult } from '../types';

/**
 * Interfaz para el resultado de listar archivos
 */
interface ListFilesResult {
  files: string[];
  directories: string[];
  path: string;
}

/**
 * Herramienta para listar archivos en un directorio
 */
export class ListFilesTool extends BaseTool<FileSystemParams, ListFilesResult> {
  static readonly NAME = 'listFiles';
  
  readonly name = ListFilesTool.NAME;
  readonly description = 'Lista archivos y directorios en una ruta';
  
  readonly parameters = {
    path: {
      type: "string" as "string",
      description: 'Ruta del directorio a listar',
      default: '.'
    },
    relativeTo: {
      type: "string" as "string",
      description: 'Si la ruta es relativa al workspace o absoluta',
      enum: ['workspace', 'absolute'],
      default: 'workspace'
    }
  };
  
  /**
   * Obtiene la ruta absoluta
   */
  private getAbsolutePath(dirPath: string, relativeTo: 'workspace' | 'absolute'): string {
    if (relativeTo === 'absolute') {
      return dirPath;
    }
    
    // Si no hay workspace abierto, usamos el directorio del proyecto
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      return path.resolve(process.cwd(), dirPath);
    }
    
    // Usamos el primer workspace folder
    const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    return path.resolve(workspacePath, dirPath);
  }
  
  async execute(params: FileSystemParams): Promise<ToolResult<ListFilesResult>> {
    try {
      this.validateParams(params);
      
      const { path: dirPath = '.', relativeTo = 'workspace' } = params;
      const absolutePath = this.getAbsolutePath(dirPath, relativeTo);
      
      // Verificar si el directorio existe
      try {
        const stat = await fs.stat(absolutePath);
        if (!stat.isDirectory()) {
          return this.error(`La ruta no es un directorio: ${absolutePath}`);
        }
      } catch (error) {
        return this.error(`No se pudo acceder al directorio: ${absolutePath}`);
      }
      
      // Leer el directorio
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });
      
      // Separar archivos y directorios
      const files: string[] = [];
      const directories: string[] = [];
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          directories.push(entry.name);
        } else {
          files.push(entry.name);
        }
      }
      
      return this.success({
        files,
        directories,
        path: absolutePath
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al listar archivos';
      return this.error(errorMessage);
    }
  }
}

// Exportar una instancia de la herramienta
export const listFilesTool = new ListFilesTool();
