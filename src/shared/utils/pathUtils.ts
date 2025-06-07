// src/shared/utils/pathUtils.ts
import * as vscode from 'vscode';
import * as path from 'path';

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
 * File search result for listing
 */
export interface FileSearchResult {
  uri: vscode.Uri;
  relativePath: string;
  name: string;
  type: 'file' | 'directory';
}

/**
 * Resolves workspace-relative path to absolute URI
 */
export function buildWorkspaceUri(vscodeAPI: typeof vscode, relativePath: string): vscode.Uri | undefined {
  const workspaceFolders = vscodeAPI.workspace.workspaceFolders;
  if (!workspaceFolders?.length) return undefined;

  try {
    // Normalize and sanitize path
    const normalizedPath = relativePath
      .replace(/\\/g, '/')
      .replace(/^\.\//, '')
      .replace(/\.\./g, ''); // Remove dangerous path traversal

    return vscode.Uri.joinPath(workspaceFolders[0].uri, normalizedPath);
  } catch (error) {
    console.error(`Error building workspace URI for "${relativePath}":`, error);
    return undefined;
  }
}

/**
 * Checks if file exists at given URI
 */
export async function fileExists(vscodeAPI: typeof vscode, uri: vscode.Uri): Promise<boolean> {
  try {
    const stat = await vscodeAPI.workspace.fs.stat(uri);
    return stat.type === vscode.FileType.File;
  } catch {
    return false;
  }
}

/**
 * Unified file search with pattern matching and filtering
 */
export async function searchFiles(
  vscodeAPI: typeof vscode,
  searchTerm?: string,
  maxResults: number = 100,
  includeDirectories: boolean = false
): Promise<FileSearchResult[]> {
  try {
    const excludePattern = '**/{node_modules,.git,.next,out,build,dist,coverage}/**';
    const includePattern = searchTerm
      ? `**/*${searchTerm}*`
      : '**/*.{ts,js,tsx,jsx,html,css,json,md,txt}';

    const uris = await vscodeAPI.workspace.findFiles(
      includePattern,
      excludePattern,
      maxResults * 2 // Get more to filter later
    );

    const results: FileSearchResult[] = [];

    for (const uri of uris.slice(0, maxResults)) {
      try {
        const stat = await vscodeAPI.workspace.fs.stat(uri);
        const isDirectory = stat.type === vscode.FileType.Directory;

        if (!includeDirectories && isDirectory) continue;

        const relativePath = vscodeAPI.workspace.asRelativePath(uri, false);
        const name = path.basename(relativePath);

        // Filter by search term if provided
        if (searchTerm && !name.toLowerCase().includes(searchTerm.toLowerCase())) {
          continue;
        }

        results.push({
          uri,
          relativePath,
          name,
          type: isDirectory ? 'directory' : 'file'
        });
      } catch {
        // Skip files that can't be accessed
        continue;
      }
    }

    // Sort by relevance: exact matches first, then by name length
    return results.sort((a, b) => {
      if (searchTerm) {
        const aExact = a.name.toLowerCase() === searchTerm.toLowerCase();
        const bExact = b.name.toLowerCase() === searchTerm.toLowerCase();
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
      }
      return a.name.length - b.name.length;
    });

  } catch (error) {
    console.error('Error in searchFiles:', error);
    return [];
  }
}

/**
 * Gets workspace file samples for suggestions
 */
export async function getWorkspaceSample(vscodeAPI: typeof vscode, maxFiles: number = 10): Promise<string[]> {
  const results = await searchFiles(vscodeAPI, undefined, maxFiles);
  return results.map(r => r.relativePath);
}

/**
 * Intelligently resolves file from user input with multiple fallback strategies
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
      suggestions: await getWorkspaceSample(vscodeAPI, maxSuggestions)
    };
  }

  try {
    // 1. Try absolute path
    if (path.isAbsolute(cleanInput)) {
      const absoluteUri = vscode.Uri.file(cleanInput);
      if (await fileExists(vscodeAPI, absoluteUri)) {
        return {
          success: true,
          uri: absoluteUri,
          relativePath: vscodeAPI.workspace.asRelativePath(absoluteUri, false)
        };
      }
    }

    // 2. Try workspace-relative path
    const workspaceUri = buildWorkspaceUri(vscodeAPI, cleanInput);
    if (workspaceUri && await fileExists(vscodeAPI, workspaceUri)) {
      return {
        success: true,
        uri: workspaceUri,
        relativePath: vscodeAPI.workspace.asRelativePath(workspaceUri, false)
      };
    }

    // 3. Search by filename with unified search
    const matches = await searchFiles(vscodeAPI, path.basename(cleanInput), maxSuggestions * 2);
    const exactMatches = matches.filter(match =>
      match.name.toLowerCase() === path.basename(cleanInput).toLowerCase()
    );

    if (exactMatches.length === 1) {
      return {
        success: true,
        uri: exactMatches[0].uri,
        relativePath: exactMatches[0].relativePath
      };
    }

    if (exactMatches.length > 1) {
      return {
        success: false,
        error: `Multiple files found matching "${path.basename(cleanInput)}"`,
        suggestions: exactMatches.map(m => m.relativePath).slice(0, maxSuggestions)
      };
    }

    // 4. Return similar files as suggestions
    const suggestions = matches.map(m => m.relativePath).slice(0, maxSuggestions);

    return {
      success: false,
      error: `File not found: ${cleanInput}`,
      suggestions: suggestions.length > 0 ? suggestions : await getWorkspaceSample(vscodeAPI, maxSuggestions)
    };

  } catch (error: unknown) {
    console.error('Error in resolveFileFromInput:', error);
    return {
      success: false,
      error: `Error searching for file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      suggestions: await getWorkspaceSample(vscodeAPI, maxSuggestions)
    };
  }
}