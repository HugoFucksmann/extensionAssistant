import * as vscode from 'vscode';
import { ToolResult } from '../../../../../srcV4/tools/types';
import * as path from 'path';

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
 * Search for text in workspace files
 * @param params Search parameters
 * @returns Search results
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
      includePattern = '**/*',
      excludePattern,
      maxResults = 100,
      isCaseSensitive = false,
      isRegExp = false,
      isWholeWord = false
    } = params;
    
    if (!query || typeof query !== 'string') {
      throw new Error(`Invalid query parameter: ${JSON.stringify(query)}. Expected a string.`);
    }

    // Get all matching files
    const files = await vscode.workspace.findFiles(
      includePattern,
      excludePattern ? excludePattern : undefined,
      maxResults
    );

    const results: SearchResult[] = [];
    let resultCount = 0;

    // Search in each file
    for (const file of files) {
      if (resultCount >= maxResults) break;

      try {
        const document = await vscode.workspace.openTextDocument(file);
        const text = document.getText();
        
        // Create regex pattern based on parameters
        let pattern = isRegExp ? query : 
          query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special regex chars
        
        if (isWholeWord) {
          pattern = `\\b${pattern}\\b`;
        }
        
        const flags = isCaseSensitive ? 'g' : 'gi';
        const regex = new RegExp(pattern, flags);
        
        // Search in each line
        const lines = text.split('\n');
        for (let i = 0; i < lines.length && resultCount < maxResults; i++) {
          const line = lines[i];
          let match: RegExpExecArray | null;
          
          while ((match = regex.exec(line)) !== null && resultCount < maxResults) {
            results.push({
              uri: file.toString(),
              fileName: path.basename(file.fsPath),
              lineNumber: i + 1,
              lineText: line,
              matchText: match[0]
            });
            resultCount++;
            
            // Avoid infinite loop for zero-length matches
            if (match.index === regex.lastIndex) {
              regex.lastIndex++;
            }
          }
        }
      } catch (error) {
        console.warn(`Error processing file ${file.fsPath}:`, error);
      }
    }
    
    return {
      success: true,
      data: { results }
    };
  } catch (error: any) {
    console.error(`[searchWorkspace] Error:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
