// src/tools/filesystem/getFileContents.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { safeReadFile, getMainWorkspacePath, normalizePath } from '../core/core'; // Import necessary core utilities

/**
 * Tool to get the content of a specific file in the workspace.
 * @param params - Parameters including filePath relative to the workspace root.
 * @returns The content of the file as a string.
 * @throws Error if the workspace is not open or the file cannot be read/found.
 */
export async function getFileContents(params: { filePath: string }): Promise<string> {
    const { filePath } = params;

    // Basic validation (ToolRunner also validates using attached properties)
    if (!filePath || typeof filePath !== 'string') {
        throw new Error('Parameter "filePath" (string) is required.');
    }

    try {
        // Use core utilities
        const workspacePath = getMainWorkspacePath();
        // Ensure the provided path is treated relative to the workspace root
        const fullPath = path.join(workspacePath, filePath);

        console.log(`[Tool] filesystem.getFileContents called for: ${filePath} (full: ${fullPath})`);

        // Use core utility for safe reading
        const content = await safeReadFile(fullPath);
        console.log(`[Tool] filesystem.getFileContents successfully read ${filePath}.`);
        return content;

    } catch (error: any) {
        console.error(`[Tool.getFileContents] Error accessing file ${filePath}:`, error.message);
        // Re-throw a standardized error
        throw new Error(`Failed to get file contents for ${filePath}: ${error.message}`);
    }
}

// Define validation rules as properties on the function for ToolRunner
getFileContents.validateParams = (params: Record<string, any>): boolean | string => {
    if (!params.filePath || typeof params.filePath !== 'string') {
        return 'Parameter "filePath" (string) is required.';
    }
    // Optional: Add more checks, e.g., if filePath looks like an absolute path
    // The path.join handles this by making it relative to workspacePath anyway,
    // but a warning might be useful.
    if (path.isAbsolute(params.filePath)) {
         console.warn(`[Tool.getFileContents] Received absolute path "${params.filePath}". Treating it relative to workspace root.`);
    }
     // Prevent accessing files outside the workspace root using '..'
     const normalizedRelativePath = normalizePath(params.filePath);
     if (normalizedRelativePath.startsWith('../') || normalizedRelativePath.includes('/../')) {
         return `File path "${params.filePath}" must be within the workspace root.`;
     }

    return true;
};

getFileContents.requiredParams = ['filePath'];