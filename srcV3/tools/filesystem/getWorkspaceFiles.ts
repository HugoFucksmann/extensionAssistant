// src/tools/filesystem/getWorkspaceFiles.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { readdir, stat, normalizePath, parseGitignore as coreParseGitignore, getMainWorkspacePath } from '../core/core'; // Use core utilities

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

// Helper function to check if a path matches a glob pattern (simplified)
// For full .gitignore spec, a dedicated glob library would be needed.
function matchesPattern(relativePath: string, entryName: string, pattern: string): boolean {
    // Normalize pattern to use forward slashes
    let normalizedPattern = normalizePath(pattern);

    // Handle directory-only patterns (ending with /) - matches if path is a directory AND pattern matches
    if (normalizedPattern.endsWith('/')) {
        normalizedPattern = normalizedPattern.slice(0, -1); // Remove trailing slash for matching
        // We don't have stats here, so we rely on the caller to check if it's a directory
        // This helper only checks the pattern match itself.
    }

    // Simple wildcard matching for '*' and '?'
    const regexPattern = normalizedPattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex characters
        .replace(/\*/g, '.*') // Replace * with .*
        .replace(/\?/g, '.'); // Replace ? with .

    // Anchor pattern to the start if it begins with /
    const regex = new RegExp(normalizedPattern.startsWith('/') ? `^${regexPattern}$` : regexPattern);

    // Check if the pattern matches the full relative path or just the entry name
    // .gitignore rules can apply to the full path or base name depending on context and anchors.
    // This simplified version checks both the entry name and the full relative path.
    // A more accurate implementation would need to consider gitignore's anchoring rules carefully.
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
    // This tool takes no parameters, so no validateParams/requiredParams properties needed.

    const excludedDirs = [...DEFAULT_EXCLUSIONS.dirs];
    const excludedFiles = [...DEFAULT_EXCLUSIONS.files];
    const mediaExtensions = [...DEFAULT_EXCLUSIONS.media];

    const files: string[] = [];
    // getMainWorkspacePath throws if no workspace, which is the desired behavior
    const rootPath = getMainWorkspacePath();

    // Use coreParseGitignore from '../core/core'
    const gitignorePatterns = await coreParseGitignore(rootPath);
    const allExcludedPatterns = [...excludedDirs, ...excludedFiles, ...gitignorePatterns, ...mediaExtensions];

    // Start the recursive traversal from the root
    await getFilesFromDirectory(
        rootPath,
        '', // Start with empty relative path
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
            const unixRelativePath = normalizePath(relativePath); // Use normalizePath from core

            // Check if the current entry (file or directory) matches any exclusion pattern
            let isExcluded = false;
            for (const pattern of excludedPatterns) {
                 // Check if the pattern matches the relative path or the entry name
                 if (matchesPattern(unixRelativePath, entry, pattern)) {
                     // For directory patterns ending in '/', we must verify it's a directory
                     if (pattern.endsWith('/')) {
                         try {
                             const stats = await stat(fullPath);
                             if (!stats.isDirectory()) {
                                 // Pattern matched, but it's not a directory, so not excluded by this pattern
                                 continue;
                             }
                         } catch {
                             // Cannot stat, assume not a directory pattern match or ignore error
                             continue;
                         }
                     }
                     // If it's not a directory pattern or it is a directory, it's excluded
                     isExcluded = true;
                     break; // Found a match, no need to check other patterns
                 }
            }

            if (isExcluded) {
                continue; // Skip this entry and its children
            }

            try {
                const statsResult = await stat(fullPath);
                if (statsResult.isDirectory()) {
                    // Recursively call for subdirectories if not excluded
                    await getFilesFromDirectory(rootDir, relativePath, files, excludedPatterns);
                } else {
                    // Add file to the list if not excluded
                    files.push(unixRelativePath);
                }
            } catch (err) {
                // Ignore errors accessing specific files/directories (e.g., permission issues)
                // console.error(`Error accessing ${fullPath}:`, err);
            }
        }
    } catch (err) {
        // Ignore errors reading directories (e.g., permission issues in system directories)
        // console.error(`Error reading directory ${currentPath}:`, err);
    }
}

// No validation/requiredParams properties needed as it takes no parameters.