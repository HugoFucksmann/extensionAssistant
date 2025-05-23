import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ToolResult } from '../../types';

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
    
    if (relativeTo === 'workspace') {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceFolder) {
        throw new Error(`No workspace folder found`);
      }
      fullPath = path.join(workspaceFolder, filePath);
    } else {
      fullPath = filePath;
    }
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
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
