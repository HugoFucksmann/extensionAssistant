import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseTool } from '../baseTool';
import { FileSystemParams, ToolResult } from '../types';

/**
 * Herramienta para leer el contenido de un archivo
 */
export class ReadFileTool extends BaseTool<FileSystemParams, string> {
  static readonly NAME = 'readFile';
  
  readonly name = ReadFileTool.NAME;
  readonly description = 'Lee el contenido de un archivo';
  
  readonly parameters = {
    path: {
      type: 'string',
      description: 'Ruta del archivo a leer',
      required: true
    },
    relativeTo: {
      type: 'string',
      description: 'Si la ruta es relativa al workspace o absoluta',
      enum: ['workspace', 'absolute'],
      default: 'workspace'
    },
    encoding: {
      type: 'string',
      description: 'Codificación del archivo',
      default: 'utf-8'
    }
  };
  
  /**
   * Obtiene la ruta absoluta del archivo
   */
  private getAbsolutePath(filePath: string, relativeTo: 'workspace' | 'absolute'): string {
    if (relativeTo === 'absolute') {
      return filePath;
    }
    
    // Si no hay workspace abierto, usamos el directorio del proyecto
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      return path.resolve(process.cwd(), filePath);
    }
    
    // Usamos el primer workspace folder
    const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    return path.resolve(workspacePath, filePath);
  }
  
  async execute(params: FileSystemParams): Promise<ToolResult<string>> {
    try {
      this.validateParams(params);
      
      const { path: filePath, relativeTo = 'workspace', encoding = 'utf-8' } = params;
      const absolutePath = this.getAbsolutePath(filePath, relativeTo);
      
      // Verificar si el archivo existe
      try {
        await fs.access(absolutePath, fs.constants.R_OK);
      } catch (error) {
        return this.error(`No se pudo acceder al archivo: ${absolutePath}`);
      }
      
      // Leer el archivo
      const content = await fs.readFile(absolutePath, { encoding: encoding as BufferEncoding });
      
      return this.success(content);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al leer el archivo';
      return this.error(errorMessage);
    }
  }
}

// Exportar una instancia de la herramienta
export const readFileTool = new ReadFileTool();
