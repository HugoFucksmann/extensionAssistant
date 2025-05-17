// src/workspace/workspaceService.ts

import * as vscode from 'vscode';
import * as path from 'path';
import { promisify } from 'util';
import * as fs from 'fs';
import * as ignore from 'ignore';
import { IWorkspaceService } from '../workspace/interfaces';




const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

/**
 * Normalizes a file path to use forward slashes, suitable for VS Code URIs and internal representation.
 * @param rawPath The raw path string.
 * @returns The normalized path string.
 */
function normalizePath(rawPath: string): string {
  return rawPath.replace(/\\/g, '/');
}

/**
 * Safely reads a file's content using VS Code's API (`vscode.workspace.openTextDocument`).
 * This is preferred over Node's `fs.readFile` in an extension context as it respects
 * VS Code's file system providers, encoding, and open editors.
 * Throws an error if the file cannot be opened or read.
 * @param filePath The absolute path to the file.
 * @returns The content of the file as a string.
 * @throws Error if the file does not exist or cannot be read.
 */
async function safeReadFile(filePath: string): Promise<string> {
  try {

    const document = await vscode.workspace.openTextDocument(filePath);
    return document.getText();
  } catch (error: any) {
   
    if (error.message && (error.message.includes('File not found') || error.message.includes('Unable to open'))) {
         throw new Error(`File not found: ${filePath}`);
    }
    throw new Error(`Failed to read file ${filePath}: ${error.message || String(error)}`);
  }
}

/**
 * Parses a .gitignore file and returns an array of patterns.
 * Handles basic cases but doesn't implement the full gitignore spec.
 * @param rootDir The absolute path to the directory containing the .gitignore file.
 * @returns An array of gitignore patterns. Returns an empty array if .gitignore is not found or cannot be read.
 */
async function parseGitignore(rootDir: string): Promise<string[]> {
  const gitignorePath = path.join(rootDir, '.gitignore');
  try {
 
    const content = await readFile(gitignorePath, 'utf-8');
    return content
      .split('\n')
      .filter(line => line.trim() !== '' && !line.startsWith('#')) 
      .map(line => line.trim());
  } catch {
   
    return [];
  }
}


/**
 * Service that provides access to workspace and file information.
 * Centralizes file system interactions for the extension.
 */
export class WorkspaceService implements IWorkspaceService {

    constructor(private context: vscode.ExtensionContext) {
      
    }

    /**
     * Gets the absolute path of the main workspace folder.
     * @returns The normalized absolute path of the first workspace folder.
     * @throws Error if no workspace folder is open.
     */
    public getMainWorkspacePath(): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders?.[0]) {
            throw new Error('No workspace folder found. Please open a folder or workspace.');
        }
        return normalizePath(workspaceFolders[0].uri.fsPath);
    }

    /**
     * Lists all files in the workspace, respecting .gitignore and configured exclusions.
     * @returns A promise that resolves with an array of normalized file paths relative to the workspace root.
     */
    public async listWorkspaceFiles(): Promise<string[]> {
        const workspacePath = this.getMainWorkspacePath();
        const gitignorePatterns = await parseGitignore(workspacePath);

      
        const ig = ignore.default().add(gitignorePatterns);

       
        const excludeConfig = vscode.workspace.getConfiguration('files').get<{ [key: string]: boolean }>('exclude') || {};
        const vscodeExcludePatterns = Object.keys(excludeConfig).filter(key => excludeConfig[key]);

        ig.add(vscodeExcludePatterns);

        const allFiles: string[] = [];

        async function readDirRecursive(currentDir: string, relativeDir: string = ''): Promise<void> {
            try {
                const entries = await readdir(currentDir, { withFileTypes: true });

                for (const entry of entries) {
                    const entryName = entry.name;
                    const entryPathAbsolute = path.join(currentDir, entryName);
                    const entryPathRelative = normalizePath(path.join(relativeDir, entryName));

                    // Check against gitignore and VS Code exclusions
                    if (ig.ignores(entryPathRelative)) {
                     
                        continue;
                    }

                    if (entry.isDirectory()) {
                      
                        await readDirRecursive(entryPathAbsolute, entryPathRelative);
                    } else {
                       
                        allFiles.push(entryPathRelative);
                    }
                }
            } catch (error) {
              
                console.error(`[WorkspaceService] Error reading directory ${currentDir}:`, error);
            }
        }

        await readDirRecursive(workspacePath);

        console.log(`[WorkspaceService] Found ${allFiles.length} files in workspace.`);
        return allFiles;
    }

    /**
     * Reads the content of a specific file.
     * @param filePath The absolute path to the file.
     * @returns A promise that resolves with the content of the file as a string.
     * @throws Error if the file does not exist or cannot be read.
     */
    public async getFileContent(filePath: string): Promise<string> {
        console.log(`[WorkspaceService] Reading file content for: ${filePath}`);
     
        return safeReadFile(filePath);
    }

    
}