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
 * Resolves workspace-relative path to absolute URI
 */
export function buildWorkspaceUri(vscodeAPI: typeof vscode, relativePath: string): vscode.Uri | undefined {
  const workspaceFolders = vscodeAPI.workspace.workspaceFolders;
  if (!workspaceFolders?.length) return undefined;

  try {
    const normalizedPath = relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
    return vscode.Uri.joinPath(workspaceFolders[0].uri, normalizedPath);
  } catch (error) {
    console.error(`Error building workspace URI for "${relativePath}":`, error);
    return undefined;
  }
}

/**
 * Searches workspace for files by name pattern with fuzzy matching
 */
async function findFiles(
  vscodeAPI: typeof vscode,
  fileName: string,
  maxResults: number = 100
): Promise<Array<{ uri: vscode.Uri; relativePath: string }>> {
  try {
    const baseName = path.basename(fileName, path.extname(fileName));
    const patterns = [
      `**/${fileName}`,
      `**/${fileName}.*`,
      `**/*${baseName}*`
    ];

    const results = await Promise.all(
      patterns.map(pattern =>
        vscodeAPI.workspace.findFiles(
          pattern,
          '**/{node_modules,.git,.next,out,build,dist}/**',
          maxResults
        )
      )
    );

    // Remove duplicates and map to result format
    const uniqueFiles = Array.from(new Map(
      results.flat().map(file => [file.toString(), file])
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
 * Gets workspace file samples for suggestions
 */
async function getWorkspaceSample(vscodeAPI: typeof vscode, maxFiles: number = 10): Promise<string[]> {
  try {
    const files = await vscodeAPI.workspace.findFiles(
      '**/*.{ts,js,tsx,jsx,html,css,json}',
      '**/node_modules/**',
      maxFiles
    );
    return files.map(uri => vscodeAPI.workspace.asRelativePath(uri, false));
  } catch (error) {
    console.error('Error getting workspace sample:', error);
    return [];
  }
}

/**
 * Gets similar file suggestions based on filename
 */
async function getSimilarFiles(
  vscodeAPI: typeof vscode,
  filename: string,
  maxResults: number
): Promise<string[]> {
  const searchTerm = filename.toLowerCase().trim();
  const allFiles = await vscodeAPI.workspace.findFiles('**/*', '**/node_modules/**,**/.git/**', 500);

  return allFiles
    .map(uri => ({
      path: vscodeAPI.workspace.asRelativePath(uri, false),
      name: path.basename(uri.fsPath).toLowerCase()
    }))
    .filter(file => file.name.includes(searchTerm) || searchTerm.includes(file.name))
    .sort((a, b) => a.name.length - b.name.length)
    .map(file => file.path)
    .slice(0, maxResults);
}

/**
 * Checks if file exists at given URI
 */
async function fileExists(vscodeAPI: typeof vscode, uri: vscode.Uri): Promise<boolean> {
  try {
    await vscodeAPI.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
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

  try {
    // 1. Try absolute path
    const absoluteUri = vscode.Uri.file(cleanInput);
    if (await fileExists(vscodeAPI, absoluteUri)) {
      return {
        success: true,
        uri: absoluteUri,
        relativePath: vscodeAPI.workspace.asRelativePath(absoluteUri, false)
      };
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

    // 3. Search by filename
    const matches = await findFiles(vscodeAPI, cleanInput);
    const exactMatches = matches.filter(match =>
      path.basename(match.relativePath).toLowerCase() === path.basename(cleanInput).toLowerCase()
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

    // 4. Get similar file suggestions
    const suggestions = await getSimilarFiles(vscodeAPI, cleanInput, maxSuggestions);

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