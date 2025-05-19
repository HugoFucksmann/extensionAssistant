import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ToolResult } from '../types';

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
    
    if (relativeTo === 'workspace') {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceFolder) {
        throw new Error(`No workspace folder found`);
      }
      fullPath = path.join(workspaceFolder, filePath);
    } else {
      fullPath = filePath;
    }
    
    // Crear directorios si no existen
    const dirPath = path.dirname(fullPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Verificar si el archivo existe
    const fileExists = fs.existsSync(fullPath);
    if (!fileExists && !createIfNotExists) {
      throw new Error(`File does not exist: ${filePath}`);
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
