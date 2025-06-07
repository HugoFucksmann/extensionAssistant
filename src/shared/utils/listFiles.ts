// src/shared/utils/listFiles.ts

import * as vscode from 'vscode';
import { searchFiles, type FileSearchResult } from './pathUtils';

export type ListedFile = {
  path: string;
  type: 'file' | 'directory' | 'symbolicLink' | 'unknown';
  name: string;
  uri: vscode.Uri;
};

/**
 * Lista archivos del workspace con filtrado eficiente
 */
export async function listFilesUtil(
  vscodeAPI: typeof vscode,
  searchPattern?: string,
  maxResults = 5000,
  includeDirectories = false
): Promise<ListedFile[]> {
  const workspaceFolder = vscodeAPI.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return [];

  try {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[listFilesUtil] Searching files in:', workspaceFolder.uri.fsPath);
    }

    // Use optimized search from pathUtils
    const searchResults = await searchFiles(
      vscodeAPI,
      searchPattern,
      maxResults,
      includeDirectories
    );

    // Convert to ListedFile format
    const listedFiles: ListedFile[] = searchResults.map(result => ({
      path: result.relativePath,
      type: result.type === 'directory' ? 'directory' : 'file',
      name: result.name,
      uri: result.uri
    }));

    if (process.env.NODE_ENV === 'development') {
      console.debug('[listFilesUtil] Files found:', listedFiles.length);
    }

    return listedFiles;
  } catch (error) {
    console.error('[listFilesUtil] Error searching files:', error);
    return [];
  }
}

