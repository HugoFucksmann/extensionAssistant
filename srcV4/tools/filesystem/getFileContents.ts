import * as vscode from 'vscode';
import * as fs from 'fs';
import { ToolResult } from '../types';
import { normalizePath, fileExists } from '../../utils/pathUtils';

/**
 * Herramienta para obtener el contenido de un archivo
 * @param params Parámetros de la herramienta
 * @returns Resultado con el contenido del archivo
 */
export async function getFileContents(params: { 
  filePath: string, 
  relativeTo?: 'workspace' | 'absolute'
}): Promise<ToolResult<{ content: string, path: string }>> {
  try {
    const { filePath, relativeTo = 'workspace' } = params;
    
    if (!filePath || typeof filePath !== 'string') {
      throw new Error(`Invalid filePath parameter: ${JSON.stringify(filePath)}. Expected a string.`);
    }
    
    let fullPath: string;
    
    // Normalize and validate the path
    try {
      fullPath = normalizePath(filePath);
      
      // Check if file exists
      if (!await fileExists(fullPath)) {
        throw new Error(`File not found: ${filePath}`);
      }
    } catch (error) {
      // Re-throw with more context if needed
      if (error instanceof Error) {
        throw new Error(`Failed to access file '${filePath}': ${error.message}`);
      }
      throw error;
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    return {
      success: true,
      data: {
        content,
        path: fullPath
      }
    };
  } catch (error: any) {
    console.error(`[getFileContents] Error reading file:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
