import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function getFileContents(params: { filePath: string }): Promise<string> {
  try {
    const { filePath } = params;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return 'file not found';
    }
    
    const fullPath = path.join(workspaceFolder, filePath);
    
    if (!fs.existsSync(fullPath)) {
      return 'file not found';
    }
    
    return fs.readFileSync(fullPath, 'utf-8');
  } catch (error) {
    return 'file not found';
  }
}