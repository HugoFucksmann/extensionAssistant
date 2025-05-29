// src/features/tools/definitions/utils.ts
import * as vscode from 'vscode';


export function resolveWorkspacePath(vscodeAPI: typeof vscode, relativePath: string): vscode.Uri | undefined {
  const workspaceFolders = vscodeAPI.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }

  try {
    return vscode.Uri.joinPath(workspaceFolders[0].uri, relativePath);
  } catch (error) {
  
    console.error(`Error resolving workspace path "${relativePath}":`, error);
    return undefined;
  }
}