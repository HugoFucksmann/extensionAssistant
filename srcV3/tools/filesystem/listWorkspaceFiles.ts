// src/tools/filesystem/listWorkspaceFiles.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as ignore from 'ignore'; // Need the ignore library
import { readdir, stat, normalizePath, parseGitignore, getMainWorkspacePath } from '../core/core'; // Use core utilities

// Interface for tool functions with static properties
interface ToolFunction {
    (): Promise<string[]>;
    validateParams?: (params: Record<string, any>) => boolean | string;
    requiredParams: string[];
}

// Re-define or import DEFAULT_EXCLUSIONS if needed, or make it configurable
// For now, let's keep the definition from the original getWorkspaceFiles.ts
const DEFAULT_EXCLUSIONS = {
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


/**
 * Tool to get a list of files in the workspace, respecting gitignore and VS Code configured exclusions.
 * @returns An array of file paths relative to the workspace root (using forward slashes).
 * @throws Error if no workspace folder is open.
 */
const listWorkspaceFiles: ToolFunction = async function listWorkspaceFiles(): Promise<string[]> {
    console.log('[Tool] filesystem.listWorkspaceFiles called.');

    const files: string[] = [];

    try {
        const rootPath = getMainWorkspacePath();

        // Use core utility to parse gitignore
        const gitignorePatterns = await parseGitignore(rootPath);

        // Use the 'ignore' library for robust pattern matching
        const ig = ignore.default().add(gitignorePatterns);

        // Get VS Code file exclude settings
        const excludeConfig = vscode.workspace.getConfiguration('files').get<{ [key: string]: boolean }>('exclude') || {};
        const vscodeExcludePatterns = Object.keys(excludeConfig).filter(key => excludeConfig[key]);

        // Add default exclusions and VS Code exclusions to the ignore filter
        ig.add(DEFAULT_EXCLUSIONS.dirs.map(dir => `${dir}/`)); // Ensure dirs end with /
        ig.add(DEFAULT_EXCLUSIONS.files);
        ig.add(DEFAULT_EXCLUSIONS.media);
        ig.add(vscodeExcludePatterns);


        // Recursive function to traverse directories
        async function readDirRecursive(currentDirAbsolute: string, relativeDir: string = ''): Promise<void> {
            try {
                // Use core utility for readdir
                const entries = await readdir(currentDirAbsolute, { withFileTypes: true });

                for (const entry of entries) {
                    const entryName = entry.name;
                    const entryPathAbsolute = path.join(currentDirAbsolute, entryName);
                    const entryPathRelative = normalizePath(path.join(relativeDir, entryName)); // Use core normalizePath

                    // Check against ignore patterns
                    // The ignore library handles directory patterns correctly
                    if (ig.ignores(entryPathRelative)) {
                        // console.log(`[Tool] Ignoring: ${entryPathRelative}`); // Optional: log ignored paths
                        continue;
                    }

                    try {
                         // Use core utility for stat
                        const statsResult = await stat(entryPathAbsolute);

                        if (statsResult.isDirectory()) {
                            // Recursively call for subdirectories
                            await readDirRecursive(entryPathAbsolute, entryPathRelative);
                        } else {
                            // Add file to the list
                            files.push(entryPathRelative);
                        }
                    } catch (err) {
                        // Handle potential errors getting stats (e.g., broken symlinks)
                        console.warn(`[Tool] Could not get stats for ${entryPathAbsolute}: ${err}`);
                    }
                }
            } catch (err) {
                // Handle errors reading directory (e.g., permissions)
                console.warn(`[Tool] Could not read directory ${currentDirAbsolute}: ${err}`);
            }
        }

        // Start the recursive traversal from the root
        await readDirRecursive(rootPath);

        console.log(`[Tool] filesystem.listWorkspaceFiles found ${files.length} files.`);
        return files;

    } catch (error: any) {
        console.error('[Tool] filesystem.listWorkspaceFiles failed:', error);
        throw new Error(`Failed to list workspace files: ${error.message || String(error)}`);
    }
}

// Define validation rules (none needed for this tool)
listWorkspaceFiles.validateParams = function validateParams(_params: Record<string, any>): boolean | string {
    return true; // No parameters required or validated
};

listWorkspaceFiles.requiredParams = []; // No required parameters

export { listWorkspaceFiles };