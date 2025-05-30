// src/shared/utils/pathUtils.ts
import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Resultado de la resolución de archivos
 */
export interface FileResolutionResult {
  success: boolean;
  uri?: vscode.Uri;
  relativePath?: string;
  error?: string;
  suggestions?: string[];
}

/**
 * Resuelve un archivo a partir de un path o nombre que puede estar mal formado
 * Maneja múltiples estrategias de búsqueda y proporciona sugerencias útiles
 * @param vscodeAPI API de VS Code
 * @param input Path o nombre del archivo (puede estar mal formado)
 * @param maxSuggestions Número máximo de sugerencias a devolver
 * @returns Resultado de la resolución con URI, error o sugerencias
 */
export async function resolveFileFromInput(
  vscodeAPI: typeof vscode,
  input: string,
  maxSuggestions: number = 10
): Promise<FileResolutionResult> {
  const cleanInput = input.trim();
  
  if (!cleanInput) {
    return {
      success: false,
      error: "File path cannot be empty",
      suggestions: await getWorkspaceFilesSample(vscodeAPI, maxSuggestions)
    };
  }

  // 1. Intentar como ruta absoluta
  try {
    const uri = vscode.Uri.file(cleanInput);
    await vscodeAPI.workspace.fs.stat(uri);
    return {
      success: true,
      uri,
      relativePath: vscodeAPI.workspace.asRelativePath(uri, false)
    };
  } catch (e) {
    // Continuar con otras estrategias
  }

  // 2. Intentar como ruta relativa al workspace
  try {
    const uri = resolveWorkspacePath(vscodeAPI, cleanInput);
    if (uri) {
      await vscodeAPI.workspace.fs.stat(uri);
      return {
        success: true,
        uri,
        relativePath: vscodeAPI.workspace.asRelativePath(uri, false)
      };
    }
  } catch (e) {
    // Continuar con búsqueda por nombre
  }

  // 3. Buscar por nombre de archivo (exacto)
  const fileName = path.basename(cleanInput);
  const exactMatches = await searchFilesByName(vscodeAPI, fileName, false);
  
  if (exactMatches.length === 1) {
    return {
      success: true,
      uri: exactMatches[0].uri,
      relativePath: exactMatches[0].relativePath
    };
  }

  if (exactMatches.length > 1) {
    // Intentar encontrar coincidencia por ruta parcial
    const pathMatch = exactMatches.find(match => 
      match.relativePath === cleanInput || 
      match.relativePath.endsWith(cleanInput) ||
      cleanInput.endsWith(match.relativePath)
    );
    
    if (pathMatch) {
      return {
        success: true,
        uri: pathMatch.uri,
        relativePath: pathMatch.relativePath
      };
    }

    return {
      success: false,
      error: `Multiple files found with name "${fileName}"`,
      suggestions: exactMatches.map(m => m.relativePath)
    };
  }

  // 4. Búsqueda difusa si no hay coincidencias exactas
  const fuzzyMatches = await searchFilesByName(vscodeAPI, fileName, true);
  
  if (fuzzyMatches.length > 0) {
    return {
      success: false,
      error: `File "${fileName}" not found`,
      suggestions: fuzzyMatches.slice(0, maxSuggestions).map(m => m.relativePath)
    };
  }

  // 5. Si no hay coincidencias, devolver archivos del workspace como sugerencias
  return {
    success: false,
    error: `File not found: ${cleanInput}`,
    suggestions: await getWorkspaceFilesSample(vscodeAPI, maxSuggestions)
  };
}

/**
 * Busca archivos por nombre en el workspace
 */
async function searchFilesByName(
  vscodeAPI: typeof vscode,
  fileName: string,
  fuzzyMatch: boolean = false
): Promise<Array<{ uri: vscode.Uri; relativePath: string; fileName: string }>> {
  try {
    const escapedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = fuzzyMatch ? `**/*${escapedFileName}*` : `**/${escapedFileName}`;
    
    const foundFiles = await vscodeAPI.workspace.findFiles(pattern, '**/node_modules/**');
    
    return foundFiles.map(uri => ({
      uri,
      relativePath: vscodeAPI.workspace.asRelativePath(uri, false),
      fileName: path.basename(uri.fsPath)
    }));
  } catch (error) {
    console.error(`Error searching for file ${fileName}:`, error);
    return [];
  }
}

/**
 * Resuelve un path relativo al workspace
 */
function resolveWorkspacePath(vscodeAPI: typeof vscode, relativePath: string): vscode.Uri | undefined {
  const workspaceFolders = vscodeAPI.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }
  
  const normalizedPath = normalizePath(relativePath);
  const cleanPath = normalizedPath.startsWith('./') ? normalizedPath.substring(2) : normalizedPath;
  
  try {
    return vscode.Uri.joinPath(workspaceFolders[0].uri, cleanPath);
  } catch (error) {
    return undefined;
  }
}

/**
 * Normaliza una ruta de archivo
 */
function normalizePath(filePath: string): string {
  let normalized = filePath.replace(/\\/g, '/').replace(/\/+/g, '/');
  normalized = normalized.replace(/(\/|^)\.\/(?!\.)/g, '$1');
  
  const parts = normalized.split('/');
  const result = [];
  
  for (const part of parts) {
    if (part === '..') {
      if (result.length > 0 && result[result.length - 1] !== '..') {
        result.pop();
      } else {
        result.push(part);
      }
    } else if (part !== '' && part !== '.') {
      result.push(part);
    }
  }
  
  return result.join('/');
}

/**
 * Obtiene una muestra de archivos del workspace para sugerencias
 */
async function getWorkspaceFilesSample(
  vscodeAPI: typeof vscode,
  maxFiles: number = 10
): Promise<string[]> {
  try {
    const extensions = ['.ts', '.js', '.tsx', '.jsx', '.html', '.css', '.json'];
    const pattern = `**/*{${extensions.join(',')}}`;
    const foundFiles = await vscodeAPI.workspace.findFiles(pattern, '**/node_modules/**', maxFiles);
    
    return foundFiles.map(uri => vscodeAPI.workspace.asRelativePath(uri, false));
  } catch (error) {
    console.error('Error getting workspace files sample:', error);
    return [];
  }
}