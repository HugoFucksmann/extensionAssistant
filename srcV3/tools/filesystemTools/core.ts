import * as path from 'path';
import { promisify } from 'util';
import * as fs from 'fs';
import * as vscode from 'vscode';

export const stat = promisify(fs.stat);
export const readdir = promisify(fs.readdir);
export const readFile = promisify(fs.readFile);

export function normalizePath(rawPath: string): string {
  return rawPath.replace(/\\/g, '/');
}

export async function safeReadFile(filePath: string): Promise<string> {
  try {
    const document = await vscode.workspace.openTextDocument(filePath);
    return document.getText();
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }
}

export async function parseGitignore(rootDir: string): Promise<string[]> {
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