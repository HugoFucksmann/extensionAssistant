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
  
        const workspacePath = getMainWorkspacePath();
       
        const fullPath = path.join(workspacePath, filePath);

       
        return await safeReadFile(fullPath);

    } catch (error: any) {
      
        console.error(`[Tool.getFileContents] Error accessing file ${filePath}:`, error.message);
       
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
        
         console.warn(`[Tool.getFileContents] Received absolute path "${params.filePath}". Assuming it's relative to workspace root.`);
     
    }
    return true;
};

getFileContents.requiredParams = ['filePath'];