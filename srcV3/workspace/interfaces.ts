// src/workspace/interfaces.ts
export interface IWorkspaceService {
    /**
     * Gets the absolute path of the main workspace folder.
     * @returns The normalized absolute path of the first workspace folder.
     * @throws Error if no workspace folder is open.
     */
    getMainWorkspacePath(): string;

    /**
     * Lists all files in the workspace, respecting .gitignore and configured exclusions.
     * @returns A promise that resolves with an array of normalized file paths relative to the workspace root.
     */
    listWorkspaceFiles(): Promise<string[]>;

    /**
     * Reads the content of a specific file.
     * @param filePath The absolute path to the file.
     * @returns A promise that resolves with the content of the file as a string.
     * @throws Error if the file does not exist or cannot be read.
     */
    getFileContent(filePath: string): Promise<string>;

   
}