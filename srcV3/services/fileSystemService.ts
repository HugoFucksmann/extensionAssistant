import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

/**
 * Service to handle file system operations
 */
export class FileSystemService {
  /**
   * Gets all files in the workspace recursively, excluding node_modules and other specified directories
   * @returns Array of file paths
   */
  private async parseGitignore(rootDir: string): Promise<string[]> {
    const gitignorePath = path.join(rootDir, '.gitignore');
    try {
      const content = await readFile(gitignorePath, 'utf-8');
      return content
        .split('\n')
        .filter(line => line.trim() !== '' && !line.startsWith('#'))
        .map(line => line.trim());
    } catch (err) {
      return [];
    }
  }

  async getWorkspaceFiles(): Promise<string[]> {
    const excludedDirs = ['node_modules', '.git', 'dist', 'build', '.vscode', '.github', 'out'];
    const excludedFiles = ['.gitignore', '.env', '.env.local', '.env.development', '.env.production'];
    const mediaExtensions = [
      // Imágenes
      '*.jpg', '*.JPG', '*.jpeg', '*.png', '*.gif', '*.svg', '*.webp', '*.bmp', '*.tiff',
      // Videos
      '*.mp4', '*.mov', '*.avi', '*.mkv', '*.webm', '*.wmv',
      // Audio
      '*.mp3', '*.wav', '*.ogg', '*.flac', '*.aac',
      // Otros
      '*.pdf', '*.zip', '*.rar', '*.tar', '*.gz', '*.otf', '*.ttf'
    ];
    
    const files: string[] = [];
    
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return [];
    }
    
    for (const folder of workspaceFolders) {
      const rootPath = folder.uri.fsPath;
      const gitignorePatterns = await this.parseGitignore(rootPath);
      await this.getFilesFromDirectory(
        rootPath, 
        '', 
        files, 
        [...excludedDirs, ...excludedFiles, ...gitignorePatterns, ...mediaExtensions]
      );
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
        const relativePath = path.join(currentDir, entry);
        const fullPath = path.join(rootDir, relativePath);
        const unixRelativePath = relativePath.replace(/\\/g, '/');
        
        // Check if entry matches any exclusion pattern
        let matchedPattern: string | null = null;
        const shouldExclude = await excludedDirs.reduce(async (prevPromise, pattern) => {
          const prevResult = await prevPromise;
          if (prevResult) return true;
          
          // Normalizar patrón
          let normalizedPattern = pattern.replace(/\\/g, '/');
          
          // Patrones que comienzan con / son relativos a root
          if (normalizedPattern.startsWith('/')) {
            normalizedPattern = normalizedPattern.substring(1);
            if (unixRelativePath === normalizedPattern) {
              matchedPattern = pattern;
              return true;
            }
            return false;
          }
          
          // Patrones que terminan con / solo aplican a directorios
          if (normalizedPattern.endsWith('/')) {
            normalizedPattern = normalizedPattern.slice(0, -1);
            try {
              const stats = await stat(fullPath);
              if (!stats.isDirectory()) return false;
            } catch {
              return false;
            }
          }
          
          // Wildcard básico
          if (normalizedPattern.includes('*')) {
            const regexPattern = normalizedPattern
              .replace(/\*/g, '.*')
              .replace(/\?/g, '.');
            const regex = new RegExp(`^${regexPattern}$`);
            if (regex.test(entry) || regex.test(unixRelativePath)) {
              matchedPattern = pattern;
              return true;
            }
            return false;
          }
          
          // Match exacto o subdirectorio
          const isMatch = entry === normalizedPattern || 
                 unixRelativePath.includes(`/${normalizedPattern}/`) || 
                 unixRelativePath.endsWith(`/${normalizedPattern}`) ||
                 unixRelativePath === normalizedPattern;
          
          if (isMatch) {
            matchedPattern = pattern;
          }
          return isMatch;
        }, Promise.resolve(false));
        
        if (shouldExclude && matchedPattern) {
         
          continue;
        }
        
        try {
          const stats = await stat(fullPath);
          
          if (stats.isDirectory()) {
            await this.getFilesFromDirectory(rootDir, relativePath, files, excludedDirs);
          } else {
            files.push(unixRelativePath);
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