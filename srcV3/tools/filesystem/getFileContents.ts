import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function getFileContents(params: any): Promise<any> {
  try {
    // Extract and validate filePath parameter
    const filePath = params.filePath;
    console.log(`[getFileContents] Received params:`, params);
    
    if (!filePath || typeof filePath !== 'string') {
      throw new Error(`Invalid filePath parameter: ${JSON.stringify(filePath)}. Expected a string.`);
    }
    
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      throw new Error(`No workspace folder found`);
    }
    
    const fullPath = path.join(workspaceFolder, filePath);
    console.log(`[getFileContents] Attempting to read file: ${fullPath}`);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    return {
      success: true,
      content: content,
      path: fullPath
    };
  } catch (error: any) {
    console.error(`[getFileContents] Error reading file:`, error.message);
    throw error; // Rethrow to let the orchestrator handle it properly
  }
}