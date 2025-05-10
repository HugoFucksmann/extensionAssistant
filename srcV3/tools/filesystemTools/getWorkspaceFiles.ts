import * as vscode from 'vscode';
import * as path from 'path';
import { readdir, stat, normalizePath, parseGitignore } from './core';

export const DEFAULT_EXCLUSIONS = {
  dirs: ['node_modules', '.git', 'dist', 'build', '.vscode', '.github', 'out'],
  files: ['.gitignore', '.env', '.env.local'],
  media: ['*.jpg', '*.jpeg', '*.png', '*.gif', '*.mp4', '*.pdf']
};

export async function getWorkspaceFiles(): Promise<string[]> {
  const { dirs, files, media } = { ...DEFAULT_EXCLUSIONS };
  const allFiles: string[] = [];
  const workspaceFolders = vscode.workspace.workspaceFolders || [];

  for (const folder of workspaceFolders) {
    const rootPath = folder.uri.fsPath;
    const gitignorePatterns = await parseGitignore(rootPath);
    await scanDirectory(
      rootPath,
      '',
      allFiles,
      [...dirs, ...files, ...media, ...gitignorePatterns]
    );
  }

  return allFiles;
}

async function scanDirectory(
  rootDir: string,
  currentDir: string,
  files: string[],
  exclusions: string[]
): Promise<void> {
  const currentPath = path.join(rootDir, currentDir);
  
  try {
    const entries = await readdir(currentPath);
    
    for (const entry of entries) {
      const relativePath = path.join(currentDir, entry);
      const fullPath = path.join(rootDir, relativePath);
      const normalizedPath = normalizePath(relativePath);

      const shouldExclude = exclusions.some(pattern => 
        entry === pattern || 
        normalizedPath.includes(`/${pattern}/`) || 
        normalizedPath.endsWith(`/${pattern}`)
      );

      if (shouldExclude) continue;

      try {
        const stats = await stat(fullPath);
        if (stats.isDirectory()) {
          await scanDirectory(rootDir, relativePath, files, exclusions);
        } else {
          files.push(normalizedPath);
        }
      } catch (err) {
        console.error(`Error accessing ${fullPath}:`, err);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${currentPath}:`, err);
  }
}