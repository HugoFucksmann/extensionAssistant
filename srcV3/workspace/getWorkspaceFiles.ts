// src/tools/filesystem/getWorkspaceFiles.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { readdir, stat, normalizePath, parseGitignore as coreParseGitignore, getMainWorkspacePath } from '../tools/core/core'; // Use core utilities

// Keep DEFAULT_EXCLUSIONS as is
export const DEFAULT_EXCLUSIONS = {
  dirs: ['node_modules', '.git', 'dist', 'build', '.vscode', '.github', 'out'],
  files: ['.gitignore', '.env', '.env.local', '.env.development', '.env.production'],
  media: [
    // Imágenes
    '*.jpg', '*.JPG', '*.jpeg', '*.png', '*.gif', '*.svg', '*.webp', '*.bmp', '*.tiff',
    // Videos
    '*.mp4', '*.mov', '*.avi', '*.mkv', '*.webm', '*.wmv',
    // Audio
    '*.mp3', '*.wav', '*.ogg', '*.flac', '*.aac',
    // Otros
    '*.pdf', '*.zip', '*.rar', '*.tar', '*.gz', '*.otf', '*.ttf'
  ]
};


function matchesPattern(relativePath: string, entryName: string, pattern: string): boolean {
    // Normalize pattern to use forward slashes
    let normalizedPattern = normalizePath(pattern);


    if (normalizedPattern.endsWith('/')) {
        normalizedPattern = normalizedPattern.slice(0, -1); // Remove trailing slash for matching
       
    }

 
    const regexPattern = normalizedPattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') 
        .replace(/\*/g, '.*') // Replace * with .*
        .replace(/\?/g, '.'); // Replace ? with .

  
    const regex = new RegExp(normalizedPattern.startsWith('/') ? `^${regexPattern}$` : regexPattern);

   
    if (regex.test(entryName) || regex.test(relativePath)) {
        return true;
    }

    // Handle patterns that match anywhere in the path if not anchored (e.g., 'node_modules')
     if (!normalizedPattern.startsWith('/') && relativePath.includes(normalizedPattern)) {
         return true;
     }


    return false;
}


/**
 * Tool to get a list of files in the workspace, respecting gitignore and default exclusions.
 * @returns An array of file paths relative to the workspace root (using forward slashes).
 * @throws Error if no workspace folder is open.
 */
export async function getWorkspaceFiles(): Promise<string[]> {
   

    const excludedDirs = [...DEFAULT_EXCLUSIONS.dirs];
    const excludedFiles = [...DEFAULT_EXCLUSIONS.files];
    const mediaExtensions = [...DEFAULT_EXCLUSIONS.media];

    const files: string[] = [];
   
    const rootPath = getMainWorkspacePath();

 
    const gitignorePatterns = await coreParseGitignore(rootPath);
    const allExcludedPatterns = [...excludedDirs, ...excludedFiles, ...gitignorePatterns, ...mediaExtensions];


    await getFilesFromDirectory(
        rootPath,
        '', 
        files,
        allExcludedPatterns
    );

    return files;
}

/**
 * Recursive helper function to traverse directories and collect files.
 * @param rootDir The absolute path of the workspace root.
 * @param currentDir The path relative to the rootDir for the current directory being processed.
 * @param files The array to push discovered file paths into.
 * @param excludedPatterns The list of patterns to exclude.
 */
async function getFilesFromDirectory(
    rootDir: string,
    currentDir: string,
    files: string[],
    excludedPatterns: string[]
): Promise<void> {
    const currentPath = path.join(rootDir, currentDir);

    try {
        const entries = await readdir(currentPath);

        for (const entry of entries) {
            const relativePath = path.join(currentDir, entry);
            const fullPath = path.join(rootDir, relativePath);
            const unixRelativePath = normalizePath(relativePath); 

          
            let isExcluded = false;
            for (const pattern of excludedPatterns) {
               
                 if (matchesPattern(unixRelativePath, entry, pattern)) {
                   
                     if (pattern.endsWith('/')) {
                         try {
                             const stats = await stat(fullPath);
                             if (!stats.isDirectory()) {
                                
                                 continue;
                             }
                         } catch {
                             
                             continue;
                         }
                     }
                    
                     isExcluded = true;
                     break; 
                 }
            }

            if (isExcluded) {
                continue; 
            }

            try {
                const statsResult = await stat(fullPath);
                if (statsResult.isDirectory()) {
                   
                    await getFilesFromDirectory(rootDir, relativePath, files, excludedPatterns);
                } else {
                  
                    files.push(unixRelativePath);
                }
            } catch (err) {
               
            }
        }
    } catch (err) {
       
    }
}

