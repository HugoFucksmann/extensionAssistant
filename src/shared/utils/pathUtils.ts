// src/shared/utils/pathUtils.ts
import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Searches workspace for files by name pattern
 */
async function findFilesByPattern(
  vscodeAPI: typeof vscode,
  fileName: string,
  fuzzyMatch: boolean = false
): Promise<Array<{ uri: vscode.Uri; relativePath: string }>> {
  try {
    // Primero intentamos con una búsqueda exacta
    let patterns = [
      `**/${fileName}`,  // Búsqueda exacta
      `**/${fileName}.*`, // Intenta con cualquier extensión
      `**/*${fileName}*`  // Búsqueda parcial
    ];

    // Si es búsqueda difusa, agregamos más patrones
    if (fuzzyMatch) {
      const baseName = path.basename(fileName, path.extname(fileName));
      patterns.push(
        `**/*${baseName}*`,  // Coincidencia parcial del nombre base
        `**/${baseName}.*`  // Nombre base con cualquier extensión
      );
    }

    // Eliminar duplicados
    patterns = [...new Set(patterns)];
    
    // Buscar archivos que coincidan con cualquiera de los patrones
    const searchPromises = patterns.map(pattern => 
      vscodeAPI.workspace.findFiles(
        pattern, 
        '**/{node_modules,.git,.next,out,build,dist}/**', // Excluir carpetas comunes
        100 // Límite de resultados por patrón
      )
    );

    const results = await Promise.all(searchPromises);
    const files = results.flat();
    
    // Eliminar duplicados por URI
    const uniqueFiles = Array.from(new Map(
      files.map(file => [file.toString(), file])
    ).values());

    return uniqueFiles.map(uri => ({
      uri,
      relativePath: vscodeAPI.workspace.asRelativePath(uri, false)
    }));
  } catch (error) {
    console.error(`Error searching for "${fileName}":`, error);
    return [];
  }
}

/**
 * Gets sample workspace files for suggestions
 */
async function getWorkspaceSample(vscodeAPI: typeof vscode, maxFiles: number = 10): Promise<string[]> {
  try {
    const extensions = ['.ts', '.js', '.tsx', '.jsx', '.html', '.css', '.json'];
    const pattern = `**/*{${extensions.join(',')}}`;
    const files = await vscodeAPI.workspace.findFiles(pattern, '**/node_modules/**', maxFiles);

    return files.map(uri => vscodeAPI.workspace.asRelativePath(uri, false));
  } catch (error) {
    console.error('Error getting workspace sample:', error);
    return [];
  }
}

/**
 * Normalizes file path (handles ./, ../, multiple slashes)
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
 * File resolution result
 */
export interface FileResolutionResult {
  success: boolean;
  uri?: vscode.Uri;
  relativePath?: string;
  error?: string;
  suggestions?: string[];
}

/**
 * Resolves workspace-relative path to absolute URI
 */
export function buildWorkspaceUri(vscodeAPI: typeof vscode, relativePath: string): vscode.Uri | undefined {
  const workspaceFolders = vscodeAPI.workspace.workspaceFolders;
  if (!workspaceFolders?.length) return undefined;

  try {
    const normalizedPath = normalizePath(relativePath);
    const cleanPath = normalizedPath.startsWith('./') ? normalizedPath.substring(2) : normalizedPath;
    return vscode.Uri.joinPath(workspaceFolders[0].uri, cleanPath);
  } catch (error) {
    console.error(`Error building workspace URI for "${relativePath}":`, error);
    return undefined;
  }
}

/**
 * Normaliza un nombre de archivo para búsqueda insensible a mayúsculas/minúsculas
 */
function normalizeForSearch(filename: string): string {
  // Eliminar espacios y convertir a minúsculas
  return filename.toLowerCase().trim();
}

/**
 * Compara dos nombres de archivo ignorando mayúsculas/minúsculas y espacios
 */
function filenamesMatch(a: string, b: string): boolean {
  return normalizeForSearch(a) === normalizeForSearch(b);
}

/**
 * Obtiene sugerencias de archivos similares basadas en el nombre
 */
async function getSimilarFileSuggestions(
  vscodeAPI: typeof vscode,
  filename: string,
  maxResults: number
): Promise<string[]> {
  // Buscar archivos con nombres similares
  const allFiles = await vscodeAPI.workspace.findFiles('**/*', '**/node_modules/**,**/.git/**', 1000);
  
  // Normalizar el nombre de búsqueda
  const searchTerm = normalizeForSearch(filename);
  
  // Filtrar y ordenar por similitud
  return allFiles
    .map(uri => ({
      path: vscodeAPI.workspace.asRelativePath(uri, false),
      name: path.basename(uri.fsPath)
    }))
    .filter(file => {
      const name = normalizeForSearch(file.name);
      return name.includes(searchTerm) || searchTerm.includes(name);
    })
    .sort((a, b) => {
      // Ordenar por longitud de nombre (más corto primero)
      return a.name.length - b.name.length;
    })
    .map(file => file.path)
    .slice(0, maxResults);
}

/**
 * Intenta encontrar un archivo con diferentes estrategias
 */
async function tryFindFile(
  vscodeAPI: typeof vscode,
  filename: string,
  maxSuggestions: number
): Promise<FileResolutionResult> {
  const cleanInput = filename.trim();
  if (!cleanInput) {
    return {
      success: false,
      error: "File path cannot be empty",
      suggestions: await getWorkspaceSample(vscodeAPI, maxSuggestions)
    };
  }

  // 1. Búsqueda exacta
  const exactMatches = await findFilesByPattern(vscodeAPI, cleanInput, false);
  
  // 2. Si no hay coincidencias exactas, buscar archivos con el mismo nombre (ignorando mayúsculas)
  const allMatches = exactMatches.length > 0 
    ? exactMatches 
    : await findFilesByPattern(vscodeAPI, cleanInput, true);

  // 3. Filtrar por coincidencia de nombre de archivo (insensible a mayúsculas)
  const matchingFiles = allMatches.filter(match => {
    const matchName = path.basename(match.relativePath);
    return filenamesMatch(matchName, cleanInput);
  });

  // Manejar los resultados
  if (matchingFiles.length === 1) {
    return {
      success: true,
      uri: matchingFiles[0].uri,
      relativePath: matchingFiles[0].relativePath
    };
  }

  if (matchingFiles.length > 1) {
    return {
      success: false,
      error: `Multiple files found matching "${path.basename(cleanInput)}"`,
      suggestions: matchingFiles.map(m => m.relativePath).slice(0, maxSuggestions)
    };
  }

  // Si no se encontró el archivo exacto, buscar sugerencias
  const suggestions = await getSimilarFileSuggestions(vscodeAPI, cleanInput, maxSuggestions);
  
  return {
    success: false,
    error: `File not found: ${cleanInput}`,
    suggestions: suggestions.length > 0 
      ? suggestions 
      : await getWorkspaceSample(vscodeAPI, maxSuggestions)
  };
}

/**
 * Inteligently resolves file from user input with multiple fallback strategies
 */
export async function resolveFileFromInput(
  vscodeAPI: typeof vscode,
  input: string,
  maxSuggestions: number = 10
): Promise<FileResolutionResult> {
  try {
    // 1. Intentar con la ruta exacta
    try {
      const uri = vscode.Uri.file(input);
      await vscodeAPI.workspace.fs.stat(uri);
      return {
        success: true,
        uri,
        relativePath: vscodeAPI.workspace.asRelativePath(uri, false)
      };
    } catch {}

    // 2. Intentar con ruta relativa al workspace
    try {
      const uri = buildWorkspaceUri(vscodeAPI, input);
      if (uri) {
        await vscodeAPI.workspace.fs.stat(uri);
        return {
          success: true,
          uri,
          relativePath: vscodeAPI.workspace.asRelativePath(uri, false)
        };
      }
    } catch {}

    // 3. Búsqueda inteligente por nombre de archivo
    return await tryFindFile(vscodeAPI, input, maxSuggestions);
  } catch (error: unknown) {
    console.error('Error in resolveFileFromInput:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Error searching for file: ${errorMessage}`,
      suggestions: await getWorkspaceSample(vscodeAPI, maxSuggestions)
    };
  }
}