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
        // Get the workspace root path. This throws if no workspace is open.
        const workspacePath = getMainWorkspacePath();
        // Construct the full absolute path
        const fullPath = path.join(workspacePath, filePath);

        // Use safeReadFile which handles opening the document via VS Code API
        // safeReadFile will throw if the file is not found or cannot be read
        return await safeReadFile(fullPath);

    } catch (error: any) {
        // Catch errors from getMainWorkspacePath or safeReadFile
        console.error(`[Tool.getFileContents] Error accessing file ${filePath}:`, error.message);
        // Re-throw a standardized error for the ToolRunner to catch
        throw new Error(`Failed to get file contents for ${filePath}: ${error.message}`);
    }
}

// Define validation rules as properties on the function for ToolRunner
getFileContents.validateParams = (params: Record<string, any>): boolean | string => {
    if (!params.filePath || typeof params.filePath !== 'string') {
        return 'Parameter "filePath" (string) is required.';
    }
    // Optional: Add more checks, e.g., if filePath looks like an absolute path
    if (path.isAbsolute(params.filePath)) {
         // Depending on requirements, you might want to disallow absolute paths
         // or handle them differently. Assuming relative paths are expected.
         console.warn(`[Tool.getFileContents] Received absolute path "${params.filePath}". Assuming it's relative to workspace root.`);
         // return 'Absolute paths are not allowed for "filePath".'; // Uncomment to disallow
    }
    return true;
};

getFileContents.requiredParams = ['filePath'];