import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Normalizes and resolves file paths, handling both absolute and relative paths.
 * For relative paths, it resolves them relative to the workspace root.
 * 
 * @param filePath The path to normalize (can be absolute or relative)
 * @returns A normalized absolute path
 */
export function normalizePath(filePath: string): string {
    if (!filePath) {
        throw new Error('File path cannot be empty');
    }

    // Handle absolute paths
    if (path.isAbsolute(filePath)) {
        return path.normalize(filePath);
    }

    // Handle relative paths relative to the workspace root
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error('No workspace folder is open');
    }

    // Use the first workspace folder as the base for relative paths
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    return path.normalize(path.join(workspaceRoot, filePath));
}

/**
 * Checks if a file exists at the given path
 * 
 * @param filePath Path to check (can be absolute or relative)
 * @returns Promise that resolves to true if the file exists, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
    try {
        const normalizedPath = normalizePath(filePath);
        await vscode.workspace.fs.stat(vscode.Uri.file(normalizedPath));
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Gets the relative path from the workspace root
 * 
 * @param filePath Absolute file path
 * @returns Relative path from workspace root, or the original path if not in workspace
 */
export function getRelativePath(filePath: string): string {
    if (!filePath) {
        return '';
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return filePath;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    
    try {
        return path.relative(workspaceRoot, filePath);
    } catch (error) {
        return filePath;
    }
}

/**
 * Gets the directory name of a file path
 * 
 * @param filePath The file path
 * @returns The directory name
 */
export function getDirectory(filePath: string): string {
    return path.dirname(filePath);
}

/**
 * Gets the file name from a path
 * 
 * @param filePath The file path
 * @param withExtension Whether to include the file extension (default: true)
 * @returns The file name
 */
export function getFileName(filePath: string, withExtension = true): string {
    return withExtension ? path.basename(filePath) : path.basename(filePath, path.extname(filePath));
}

export default {
    normalizePath,
    fileExists,
    getRelativePath,
    getDirectory,
    getFileName
};
