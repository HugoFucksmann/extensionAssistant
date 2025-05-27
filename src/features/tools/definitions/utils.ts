// src/features/tools/definitions/utils.ts
import * as vscode from 'vscode';

/**
 * Resuelve un path relativo al primer workspace folder.
 * Devuelve undefined si no hay workspace folder o el path es inválido.
 */
export function resolveWorkspacePath(vscodeAPI: typeof vscode, relativePath: string): vscode.Uri | undefined {
  const workspaceFolders = vscodeAPI.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }
  // Asumimos que el path es relativo al primer workspace folder
  // Podrías añadir lógica para manejar múltiples workspaces si es necesario
  try {
    return vscode.Uri.joinPath(workspaceFolders[0].uri, relativePath);
  } catch (error) {
    // Podría fallar si relativePath es malformado, ej. ".." excesivos
    console.error(`Error resolving workspace path "${relativePath}":`, error);
    return undefined;
  }
}