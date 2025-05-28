// src/shared/utils/pathUtils.ts
import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Tipo de resultado para las búsquedas de archivos
 */
export interface FileSearchResult {
  uri: vscode.Uri;
  relativePath: string;
  fileName: string;
  extension: string;
  isExactMatch: boolean;
}

/**
 * Resuelve una ruta de archivo de manera robusta, intentando múltiples estrategias
 * @param vscodeAPI API de VS Code
 * @param filePath Ruta del archivo (absoluta o relativa)
 * @returns URI del archivo si se encuentra, undefined si no
 */
export async function resolveFilePath(
  vscodeAPI: typeof vscode,
  filePath: string
): Promise<vscode.Uri | undefined> {
  // 1. Intentar como ruta absoluta
  try {
    const uri = vscode.Uri.file(filePath);
    await vscodeAPI.workspace.fs.stat(uri); // Verificar si existe
    return uri;
  } catch (e) {
    // No es una ruta absoluta válida o el archivo no existe
  }

  // 2. Intentar como ruta relativa al workspace
  try {
    const uri = resolveWorkspacePath(vscodeAPI, filePath);
    if (uri) {
      await vscodeAPI.workspace.fs.stat(uri); // Verificar si existe
      return uri;
    }
  } catch (e) {
    // No es una ruta relativa válida o el archivo no existe
  }

  // 3. Intentar buscar por nombre de archivo
  const fileName = path.basename(filePath);
  const results = await findFilesByName(vscodeAPI, fileName);
  
  if (results.length === 1) {
    return results[0].uri;
  }

  // 4. Si hay múltiples resultados, intentar encontrar la mejor coincidencia
  if (results.length > 1) {
    // Intentar encontrar una coincidencia exacta con la ruta relativa
    const exactMatch = results.find(r => r.relativePath === filePath || r.relativePath.endsWith(filePath));
    if (exactMatch) {
      return exactMatch.uri;
    }
    
    // Si no hay coincidencia exacta, devolver undefined (el llamante deberá manejar múltiples resultados)
  }

  return undefined;
}

/**
 * Resuelve un path relativo al primer workspace folder
 * @param vscodeAPI API de VS Code
 * @param relativePath Ruta relativa al workspace
 * @returns URI del archivo o undefined si no se puede resolver
 */
export function resolveWorkspacePath(
  vscodeAPI: typeof vscode,
  relativePath: string
): vscode.Uri | undefined {
  const workspaceFolders = vscodeAPI.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }
  
  // Normalizar la ruta para manejar barras invertidas y otros problemas
  const normalizedPath = normalizePath(relativePath);
  
  // Eliminar cualquier prefijo ./ que pueda tener la ruta
  const cleanPath = normalizedPath.startsWith('./') ? normalizedPath.substring(2) : normalizedPath;
  
  try {
    return vscode.Uri.joinPath(workspaceFolders[0].uri, cleanPath);
  } catch (error) {
    console.error(`Error resolving workspace path "${relativePath}":`, error);
    return undefined;
  }
}

/**
 * Normaliza una ruta de archivo para que sea consistente en todos los sistemas operativos
 * @param filePath Ruta del archivo a normalizar
 * @returns Ruta normalizada
 */
export function normalizePath(filePath: string): string {
  // Convertir barras invertidas a barras normales (Windows -> Unix)
  let normalized = filePath.replace(/\\/g, '/');
  
  // Eliminar barras duplicadas
  normalized = normalized.replace(/\/+/g, '/');
  
  // Eliminar './' redundantes
  normalized = normalized.replace(/(\/|^)\.\/(?!\.)/g, '$1');
  
  // Resolver '..' (subir un nivel)
  const parts = normalized.split('/');
  const result = [];
  
  for (const part of parts) {
    if (part === '..') {
      if (result.length > 0 && result[result.length - 1] !== '..') {
        result.pop();
      } else {
        result.push(part); // Mantener '..' al principio de la ruta
      }
    } else if (part !== '' && part !== '.') {
      result.push(part);
    }
  }
  
  return result.join('/');
}

/**
 * Busca archivos por nombre en todo el workspace
 * @param vscodeAPI API de VS Code
 * @param fileName Nombre del archivo a buscar (puede incluir extensión)
 * @param fuzzyMatch Si es true, busca coincidencias parciales
 * @returns Lista de resultados de búsqueda
 */
export async function findFilesByName(
  vscodeAPI: typeof vscode,
  fileName: string,
  fuzzyMatch: boolean = false
): Promise<FileSearchResult[]> {
  try {
    // Escapar caracteres especiales en el nombre del archivo
    const escapedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Crear el patrón de búsqueda
    let pattern;
    if (fuzzyMatch) {
      // Búsqueda difusa: cualquier archivo que contenga el nombre
      pattern = `**/*${escapedFileName}*`;
    } else {
      // Búsqueda exacta: coincidencia exacta con el nombre de archivo
      pattern = `**/${escapedFileName}`;
    }
    
    // Buscar archivos que coincidan con el patrón
    const foundFiles = await vscodeAPI.workspace.findFiles(pattern, '**/node_modules/**');
    
    // Convertir los resultados a un formato más útil
    return foundFiles.map(uri => {
      const relativePath = vscodeAPI.workspace.asRelativePath(uri, false);
      const parsedPath = path.parse(relativePath);
      
      return {
        uri,
        relativePath,
        fileName: parsedPath.base,
        extension: parsedPath.ext,
        isExactMatch: parsedPath.base === fileName
      };
    });
  } catch (error) {
    console.error(`Error searching for file ${fileName}:`, error);
    return [];
  }
}

/**
 * Obtiene una lista de archivos en el workspace para sugerir al modelo
 * @param vscodeAPI API de VS Code
 * @param maxFiles Número máximo de archivos a devolver
 * @param extensions Extensiones de archivo a incluir (por defecto, archivos de código comunes)
 * @returns Lista de rutas relativas de archivos
 */
export async function getWorkspaceFilesList(
  vscodeAPI: typeof vscode,
  maxFiles: number = 50,
  extensions: string[] = ['.ts', '.js', '.tsx', '.jsx', '.html', '.css', '.json']
): Promise<string[]> {
  try {
    // Crear un patrón para buscar archivos con las extensiones especificadas
    const pattern = `**/*{${extensions.join(',')}}`;    
    const foundFiles = await vscodeAPI.workspace.findFiles(pattern, '**/node_modules/**', maxFiles);
    
    // Convertir a rutas relativas
    return foundFiles.map(uri => vscodeAPI.workspace.asRelativePath(uri, false));
  } catch (error) {
    console.error('Error getting workspace files list:', error);
    return [];
  }
}

/**
 * Agrupa archivos por carpeta para una mejor organización
 * @param vscodeAPI API de VS Code
 * @param files Lista de URIs de archivos
 * @returns Objeto con carpetas como claves y listas de archivos como valores
 */
export function groupFilesByFolder(
  vscodeAPI: typeof vscode,
  files: vscode.Uri[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  
  for (const uri of files) {
    const relativePath = vscodeAPI.workspace.asRelativePath(uri, false);
    const dirName = path.dirname(relativePath);
    
    if (!result[dirName]) {
      result[dirName] = [];
    }
    
    result[dirName].push(relativePath);
  }
  
  return result;
}