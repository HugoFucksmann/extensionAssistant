// src/tools/filesystem/createDirectory.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises'; // Use promises version for async

/**
 * Parameters for the filesystem.createDirectory tool.
 */
export interface FilesystemCreateDirectoryParams {
    /** The path where the directory should be created, relative to the workspace root. */
    directoryPath: string;
    /** Optional: Whether to create parent directories if they don't exist. Defaults to true. */
    recursive?: boolean;
}

/**
 * Creates a new directory in the workspace.
 * @param params The parameters for creating the directory.
 * @returns A promise resolving to the absolute path of the created directory.
 * @throws Error if creation fails.
 */
export async function createDirectory(params: FilesystemCreateDirectoryParams): Promise<{ directoryPath: string; message: string }> {
    const { directoryPath, recursive = true } = params;

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error("No workspace folder open.");
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const absolutePath = path.join(workspaceRoot, directoryPath);

    console.log(`[Tool] filesystem.createDirectory: Attempting to create directory "${directoryPath}" at "${absolutePath}"`);

    try {
        await fs.mkdir(absolutePath, { recursive: recursive });
        console.log(`[Tool] filesystem.createDirectory: Directory "${directoryPath}" created successfully.`);

        return {
            directoryPath: absolutePath,
            message: `Directory "${directoryPath}" created successfully.`
        };

    } catch (error: any) {
        console.error(`[Tool] filesystem.createDirectory: Failed to create directory "${directoryPath}":`, error);
        throw new Error(`Failed to create directory "${directoryPath}": ${error.message || String(error)}`);
    }
}