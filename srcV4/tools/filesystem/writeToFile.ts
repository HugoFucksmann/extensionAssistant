import * as vscode from 'vscode';
import * as fs from 'fs';
import { ToolResult } from '../types';
import { normalizePath, fileExists, getDirectory } from '../../utils/pathUtils';

/**
 * Herramienta para escribir contenido en un archivo
 * @param params Parámetros de la herramienta
 * @returns Resultado de la operación
 */
export async function writeToFile(params: { 
  filePath: string, 
  content: string,
  relativeTo?: 'workspace' | 'absolute',
  createIfNotExists?: boolean
}): Promise<ToolResult<{ path: string }>> {
  try {
    const { 
      filePath, 
      content, 
      relativeTo = 'workspace',
      createIfNotExists = true 
    } = params;
    
    if (!filePath || typeof filePath !== 'string') {
      throw new Error(`Invalid filePath parameter: ${JSON.stringify(filePath)}. Expected a string.`);
    }
    
    let fullPath: string;
    
    try {
      // Normalize the path
      fullPath = normalizePath(filePath);
      
      // Create directories if they don't exist
      const dirPath = getDirectory(fullPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Check if file exists if we're not supposed to create it
      if (!createIfNotExists && !(await fileExists(fullPath))) {
        throw new Error(`File does not exist: ${filePath}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to prepare file path '${filePath}': ${error.message}`);
      }
      throw error;
    }
    
    // Escribir el contenido en el archivo
    fs.writeFileSync(fullPath, content, 'utf-8');
    
    return {
      success: true,
      data: {
        path: fullPath
      }
    };
  } catch (error: any) {
    console.error(`[writeToFile] Error writing to file:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
