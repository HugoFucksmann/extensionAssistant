import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ToolResult } from '../types';
import { normalizePath } from '../../utils/pathUtils';

/**
 * Información de un archivo o directorio
 */
export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  extension?: string;
}

/**
 * Herramienta para listar archivos en un directorio
 * @param params Parámetros de la herramienta
 * @returns Resultado con la lista de archivos
 */
export async function listFiles(params: { 
  dirPath: string, 
  relativeTo?: 'workspace' | 'absolute',
  includePattern?: string,
  excludePattern?: string,
  recursive?: boolean
}): Promise<ToolResult<{ files: FileInfo[] }>> {
  try {
    const { 
      dirPath, 
      relativeTo = 'workspace',
      includePattern,
      excludePattern,
      recursive = false
    } = params;
    
    if (!dirPath || typeof dirPath !== 'string') {
      throw new Error(`Invalid dirPath parameter: ${JSON.stringify(dirPath)}. Expected a string.`);
    }
    
    // Normalize the path
    let fullPath: string;
    try {
      fullPath = normalizePath(dirPath);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Invalid directory path '${dirPath}': ${error.message}`);
      }
      throw error;
    }
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }
    
    if (!fs.statSync(fullPath).isDirectory()) {
      throw new Error(`Path is not a directory: ${dirPath}`);
    }
    
    // Función para listar archivos recursivamente
    const listFilesRecursive = (dir: string): FileInfo[] => {
      const files: FileInfo[] = [];
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const entryPath = path.join(dir, entry);
        const stat = fs.statSync(entryPath);
        const isDirectory = stat.isDirectory();
        
        // Aplicar patrones de inclusión/exclusión
        if (excludePattern && new RegExp(excludePattern).test(entry)) {
          continue;
        }
        
        if (includePattern && !isDirectory && !new RegExp(includePattern).test(entry)) {
          continue;
        }
        
        const fileInfo: FileInfo = {
          name: entry,
          path: entryPath,
          isDirectory
        };
        
        if (!isDirectory) {
          fileInfo.size = stat.size;
          fileInfo.extension = path.extname(entry).slice(1);
        }
        
        files.push(fileInfo);
        
        // Recursivamente listar archivos en subdirectorios
        if (isDirectory && recursive) {
          const subFiles = listFilesRecursive(entryPath);
          files.push(...subFiles);
        }
      }
      
      return files;
    };
    
    const files = listFilesRecursive(fullPath);
    
    return {
      success: true,
      data: {
        files
      }
    };
  } catch (error: any) {
    console.error(`[listFiles] Error listing files:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
