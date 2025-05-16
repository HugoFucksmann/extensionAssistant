import * as path from 'path';
import { promisify } from 'util';
import * as fs from 'fs';
import * as vscode from 'vscode';

// Export standard Node.js fs functions promisified
export const stat = promisify(fs.stat);
export const readdir = promisify(fs.readdir);
export const readFile = promisify(fs.readFile);

/**
 * Normalizes a file path to use forward slashes, suitable for VS Code URIs and internal representation.
 * @param rawPath The raw path string.
 * @returns The normalized path string.
 */
export function normalizePath(rawPath: string): string {
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
export async function safeReadFile(filePath: string): Promise<string> {
  try {
    // Use VS Code API which respects workspace context, encoding, etc.
    const document = await vscode.workspace.openTextDocument(filePath);
    return document.getText();
  } catch (error: any) {
    // Wrap potential VS Code errors in a standard Error object
    // Check for common file not found error message from VS Code API
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
export async function parseGitignore(rootDir: string): Promise<string[]> {
  const gitignorePath = path.join(rootDir, '.gitignore');
  try {
    // Use Node's fs.readFile here as .gitignore is a standard file
    const content = await readFile(gitignorePath, 'utf-8');
    return content
      .split('\n')
      .filter(line => line.trim() !== '' && !line.startsWith('#')) // Remove empty lines and comments
      .map(line => line.trim());
  } catch {
    // Return empty array if .gitignore doesn't exist or can't be read
    return [];
  }
}

/**
 * Gets the absolute path of the main workspace folder.
 * @returns The normalized absolute path of the first workspace folder.
 * @throws Error if no workspace folder is open.
 */
export function getMainWorkspacePath(): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.[0]) {
      // Throw a more specific error if no workspace is open
      throw new Error('No workspace folder found. Please open a folder or workspace.');
  }
  return normalizePath(workspaceFolders[0].uri.fsPath);
}