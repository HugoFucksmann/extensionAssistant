// src/shared/utils/listFiles.ts

import * as vscode from 'vscode';

type ListedFile = { path: string; type: 'file' | 'directory' | 'symbolicLink' | 'unknown' };

/**
 * Lista archivos del workspace con filtrado
 */
export async function listFilesUtil(
  vscodeAPI: typeof vscode,
  pattern = '**/*',
  maxResults = 5000
): Promise<ListedFile[]> {
  const workspaceFolder = vscodeAPI.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return [];

  try {
    // Logging para debug
    console.log('[listFilesUtil] Buscando archivos en:', workspaceFolder.uri.fsPath);

    // Buscar archivos usando findFiles directamente
    const files = await vscodeAPI.workspace.findFiles(
      pattern,
      '**/node_modules/**,**/.git/**',
      maxResults
    );

    // Mapear a formato ListedFile
    const listedFiles: ListedFile[] = files.map(uri => ({
      path: vscode.workspace.asRelativePath(uri, false),
      type: 'file'
    }));

    // Logging para debug
    console.log('[listFilesUtil] Archivos encontrados:', listedFiles.length);
    return listedFiles;
  } catch (error) {
    console.error('[listFilesUtil] Error al buscar archivos:', error);
    return [];
  }
}