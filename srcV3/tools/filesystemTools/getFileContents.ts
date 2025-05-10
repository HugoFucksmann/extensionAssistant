import * as vscode from 'vscode';
import * as path from 'path';
import { safeReadFile } from './core';

export async function getFileContents(filePath: string): Promise<string> {
  const workspaceFolders = vscode.workspace.workspaceFolders || [];
  
  for (const folder of workspaceFolders) {
    try {
      const fullPath = path.join(folder.uri.fsPath, filePath);
      return await safeReadFile(fullPath);
    } catch {
      continue;
    }
  }
  
  throw new Error(`File not found in workspace: ${filePath}`);
}