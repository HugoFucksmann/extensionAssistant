// src/tools/filesystem/createFile.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises'; // Use promises version for async

/**
 * Parameters for the filesystem.createFile tool.
 */
export interface FilesystemCreateFileParams {
    /** The path where the file should be created, relative to the workspace root. */
    filePath: string;
    /** Optional: The content to write to the file. Defaults to an empty file. */
    content?: string;
    /** Optional: Whether to overwrite the file if it already exists. Defaults to false. */
    overwrite?: boolean;
}

/**
 * Creates a new file in the workspace.
 * @param params The parameters for creating the file.
 * @returns A promise resolving to the absolute path of the created file.
 * @throws Error if the file already exists and overwrite is false, or if creation fails.
 */
export async function createFile(params: FilesystemCreateFileParams): Promise<{ filePath: string; message: string }> {
    const { filePath, content = '', overwrite = false } = params;

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error("No workspace folder open.");
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const absolutePath = path.join(workspaceRoot, filePath);

    console.log(`[Tool] filesystem.createFile: Attempting to create file "${filePath}" at "${absolutePath}"`);

    try {
        // Check if file exists
        const exists = await fs.stat(absolutePath).then(() => true).catch(() => false);

        if (exists && !overwrite) {
            const errorMsg = `File already exists and overwrite is false: "${filePath}"`;
            console.warn(`[Tool] filesystem.createFile: ${errorMsg}`);
            throw new Error(errorMsg);
        }

        // Ensure directory exists
        const directory = path.dirname(absolutePath);
        await fs.mkdir(directory, { recursive: true });
        console.log(`[Tool] filesystem.createFile: Ensured directory "${directory}" exists.`);

        // Write file content
        await fs.writeFile(absolutePath, content, { flag: overwrite ? 'w' : 'wx' }); // 'wx' ensures it fails if file exists and overwrite is false
        console.log(`[Tool] filesystem.createFile: File "${filePath}" created/written successfully.`);

        // Optionally open the created file in the editor
        const uri = vscode.Uri.file(absolutePath);
        await vscode.window.showTextDocument(uri);

        return {
            filePath: absolutePath,
            message: `File "${filePath}" created successfully.`
        };

    } catch (error: any) {
        console.error(`[Tool] filesystem.createFile: Failed to create file "${filePath}":`, error);
        throw new Error(`Failed to create file "${filePath}": ${error.message || String(error)}`);
    }
}