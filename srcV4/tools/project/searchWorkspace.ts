import * as vscode from 'vscode';
import { ToolResult } from '../types';

/**
 * Resultado de búsqueda
 */
export interface SearchResult {
  uri: string;
  fileName: string;
  lineNumber: number;
  lineText: string;
  matchText: string;
}

/**
 * Herramienta para buscar en el workspace
 * @param params Parámetros de la herramienta
 * @returns Resultado con las coincidencias encontradas
 */
export async function searchWorkspace(params: {
  query: string;
  includePattern?: string;
  excludePattern?: string;
  maxResults?: number;
  isCaseSensitive?: boolean;
  isRegExp?: boolean;
  isWholeWord?: boolean;
}): Promise<ToolResult<{ results: SearchResult[] }>> {
  try {
    const {
      query,
      includePattern,
      excludePattern,
      maxResults = 100,
      isCaseSensitive = false,
      isRegExp = false,
      isWholeWord = false
    } = params;
    
    if (!query || typeof query !== 'string') {
      throw new Error(`Invalid query parameter: ${JSON.stringify(query)}. Expected a string.`);
    }
    
    // Crear opciones de búsqueda
    const options: vscode.FindInFilesOptions = {
      maxResults,
      useDefaultExcludeSettingAndIgnoreFiles: true
    };
    
    if (includePattern) {
      options.include = includePattern;
    }
    
    if (excludePattern) {
      options.exclude = excludePattern;
    }
    
    // Configurar flags de búsqueda
    let flags = '';
    if (!isCaseSensitive) flags += 'i';
    if (isRegExp) flags += 'g';
    
    // Realizar la búsqueda
    const searchResults = await vscode.workspace.findTextInFiles(
      { pattern: query, flags, isWordMatch: isWholeWord },
      options
    );
    
    // Procesar los resultados
    const results: SearchResult[] = [];
    
    searchResults.forEach(fileResult => {
      fileResult.matches.forEach(match => {
        const uri = fileResult.uri.toString();
        const fileName = uri.split('/').pop() || '';
        
        match.ranges.forEach(range => {
          results.push({
            uri,
            fileName,
            lineNumber: match.lineNumber,
            lineText: match.preview.text,
            matchText: match.preview.text.substring(range.start, range.end)
          });
        });
      });
    });
    
    return {
      success: true,
      data: {
        results
      }
    };
  } catch (error: any) {
    console.error(`[searchWorkspace] Error:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
