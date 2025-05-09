import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

/**
 * Service to handle file system operations
 */
export class FileSystemService {
  /**
   * Gets all files in the workspace recursively, excluding node_modules and other specified directories
   * @returns Array of file paths
   */
  async getWorkspaceFiles(): Promise<string[]> {
    const excludedDirs = ['node_modules', '.git', 'dist', 'build', '.vscode', '.github', 'out'];
    const files: string[] = [];
    
    // Get all workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return [];
    }
    
    // Process each workspace folder
    for (const folder of workspaceFolders) {
      const rootPath = folder.uri.fsPath;
      await this.getFilesFromDirectory(rootPath, '', files, excludedDirs);
    }
    
    return files;
  }
  
  /**
   * Recursively gets files from directory
   * @param rootDir Root directory path
   * @param currentDir Current relative directory
   * @param files Array to store file paths
   * @param excludedDirs Directories to exclude
   */
  private async getFilesFromDirectory(
    rootDir: string, 
    currentDir: string, 
    files: string[], 
    excludedDirs: string[]
  ): Promise<void> {
    const currentPath = path.join(rootDir, currentDir);
    
    try {
      const entries = await readdir(currentPath);
      
      for (const entry of entries) {
        // Skip excluded directories
        if (excludedDirs.includes(entry)) {
          continue;
        }
        
        const relativePath = path.join(currentDir, entry);
        const fullPath = path.join(rootDir, relativePath);
        
        try {
          const stats = await stat(fullPath);
          
          if (stats.isDirectory()) {
            // Recursively get files from subdirectory
            await this.getFilesFromDirectory(rootDir, relativePath, files, excludedDirs);
          } else {
            // Add file path relative to workspace
            const workspaceRelativePath = relativePath.replace(/\\/g, '/');
            files.push(workspaceRelativePath);
          }
        } catch (err) {
          console.error(`Error accessing ${fullPath}:`, err);
        }
      }
    } catch (err) {
      console.error(`Error reading directory ${currentPath}:`, err);
    }
  }
  
  /**
   * Gets the contents of a file
   * @param filePath File path relative to workspace
   * @returns File contents as string
   */
  async getFileContents(filePath: string): Promise<string> {
    // Find workspace folder containing the file
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      throw new Error('No workspace folders found');
    }
    
    for (const folder of workspaceFolders) {
      const fullPath = path.join(folder.uri.fsPath, filePath);
      
      try {
        const document = await vscode.workspace.openTextDocument(fullPath);
        return document.getText();
      } catch (err) {
        // Continue to next workspace folder
      }
    }
    
    throw new Error(`File not found: ${filePath}`);
  }
}