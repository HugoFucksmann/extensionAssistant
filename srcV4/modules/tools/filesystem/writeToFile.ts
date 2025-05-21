import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseTool } from '../baseTool';
import { FileSystemParams, ToolResult } from '../types';

/**
 * Herramienta para escribir contenido en un archivo
 */
export class WriteToFileTool extends BaseTool<FileSystemParams, void> {
  static readonly NAME = 'writeToFile';
  
  readonly name = WriteToFileTool.NAME;
  readonly description = 'Escribe contenido en un archivo';
  
  readonly parameters = {
    path: {
      type: "string" as "string",
      description: 'Ruta del archivo a escribir',
      required: true
    },
    content: {
      type: "string" as "string",
      description: 'Contenido a escribir en el archivo',
      required: true
    },
    relativeTo: {
      type: "string" as "string",
      description: 'Si la ruta es relativa al workspace o absoluta',
      enum: ['workspace', 'absolute'],
      default: 'workspace'
    },
    createIfNotExists: {
      type: "boolean" as "boolean",
      description: 'Crear el archivo si no existe',
      default: true
    },
    encoding: {
      type: "string" as "string",
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
  
  async execute(params: FileSystemParams): Promise<ToolResult<void>> {
    try {
      this.validateParams(params);
      
      const { 
        path: filePath, 
        content, 
        relativeTo = 'workspace', 
        createIfNotExists = true,
        encoding = 'utf-8'
      } = params;
      
      const absolutePath = this.getAbsolutePath(filePath, relativeTo);
      
      // Verificar si el directorio padre existe
      const dirPath = path.dirname(absolutePath);
      try {
        await fs.access(dirPath);
      } catch (error) {
        if (createIfNotExists) {
          await fs.mkdir(dirPath, { recursive: true });
        } else {
          return this.error(`El directorio no existe: ${dirPath}`);
        }
      }
      
      // Verificar si el archivo existe
      if (!createIfNotExists) {
        try {
          await fs.access(absolutePath);
        } catch (error) {
          return this.error(`El archivo no existe: ${absolutePath}`);
        }
      }
      
      // Escribir el archivo
      if (content === undefined) {
        return this.error('El contenido no puede estar vacío');
      }
      
      await fs.writeFile(absolutePath, content, { encoding: encoding as BufferEncoding });
      
      return this.success(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al escribir en el archivo';
      return this.error(errorMessage);
    }
  }
}

// Exportar una instancia de la herramienta
export const writeToFileTool = new WriteToFileTool();
