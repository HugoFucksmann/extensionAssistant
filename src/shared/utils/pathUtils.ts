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
    const escapedName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = fuzzyMatch ? `**/*${escapedName}*` : `**/${escapedName}`;

    const files = await vscodeAPI.workspace.findFiles(pattern, '**/node_modules/**');

    return files.map(uri => ({
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

  // Try absolute path
  try {
    const uri = vscode.Uri.file(cleanInput);
    await vscodeAPI.workspace.fs.stat(uri);
    return {
      success: true,
      uri,
      relativePath: vscodeAPI.workspace.asRelativePath(uri, false)
    };
  } catch { }

  // Try workspace-relative path
  try {
    const uri = buildWorkspaceUri(vscodeAPI, cleanInput);
    if (uri) {
      await vscodeAPI.workspace.fs.stat(uri);
      return {
        success: true,
        uri,
        relativePath: vscodeAPI.workspace.asRelativePath(uri, false)
      };
    }
  } catch { }

  // Search by exact filename
  const fileName = path.basename(cleanInput);
  const exactMatches = await findFilesByPattern(vscodeAPI, fileName, false);

  if (exactMatches.length === 1) {
    return {
      success: true,
      uri: exactMatches[0].uri,
      relativePath: exactMatches[0].relativePath
    };
  }

  if (exactMatches.length > 1) {
    // Try to disambiguate by partial path match
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

  // Fuzzy search fallback
  const fuzzyMatches = await findFilesByPattern(vscodeAPI, fileName, true);

  if (fuzzyMatches.length > 0) {
    return {
      success: false,
      error: `File "${fileName}" not found`,
      suggestions: fuzzyMatches.slice(0, maxSuggestions).map(m => m.relativePath)
    };
  }


  return {
    success: false,
    error: `File not found: ${cleanInput}`,
    suggestions: await getWorkspaceSample(vscodeAPI, maxSuggestions)
  };
}