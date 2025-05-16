// src/tools/codeManipulation/applyWorkspaceEdit.ts

import * as vscode from 'vscode';
import * as path from 'path'; // Needed for path.join
import { getMainWorkspacePath, normalizePath } from '../core/core'; // Import core utilities

// Define interface for expected parameters
interface ApplyWorkspaceEditParams {
    edits: Array<{
        file: string; // Path relative to workspace root
        changes: Array<{
            range: { start: { line: number, character: number }, end: { line: number, character: number } };
            newText: string;
        }>;
    }>;
    // Add options like 'preview' or 'confirm' if the tool should handle that
    // preview?: boolean;
    // confirm?: boolean;
    // Optional: flag to save the documents after applying edits
    // save?: boolean;
}

/**
 * Tool to apply a set of text edits across multiple files in the workspace.
 * Constructs a vscode.WorkspaceEdit and applies it.
 * @param params - Parameters including the array of edits to apply.
 * @returns A success status and message.
 * @throws Error if no workspace is open, no edits are provided, validation fails, or the operation fails.
 */
export async function applyWorkspaceEdit(params: ApplyWorkspaceEditParams): Promise<{ success: boolean, message: string }> {
    console.log(`[Tool] applyWorkspaceEdit called with ${params.edits?.length || 0} file edits.`);

    // Validation is also handled by ToolRunner using the attached properties,
    // but a basic check here doesn't hurt and provides immediate feedback if called directly.
    if (!params.edits || !Array.isArray(params.edits) || params.edits.length === 0) {
        // Throwing an error is consistent with ToolRunner's error handling
        throw new Error("No edits provided.");
    }

    try {
        // Get the workspace root URI. This throws if no workspace is open.
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders?.[0]) {
            throw new Error("No workspace folder found to apply edits.");
        }
        const workspaceRootUri = workspaceFolders[0].uri;

        const workspaceEdit = new vscode.WorkspaceEdit();

        // Iterate through the provided file edits
        for (const fileEdit of params.edits) {
            // Construct the URI for the file relative to the workspace root
            // Use vscode.Uri.joinPath for robustness
            const uri = vscode.Uri.joinPath(workspaceRootUri, normalizePath(fileEdit.file));

            // Iterate through the changes for the current file
            for (const change of fileEdit.changes) {
                // Create a vscode.Range object from the provided range data
                // VS Code Ranges are 0-indexed for line and character
                const range = new vscode.Range(
                    change.range.start.line, change.range.start.character,
                    change.range.end.line, change.range.end.character
                );

                // Add the replace edit to the workspace edit
                workspaceEdit.replace(uri, range, change.newText);
            }
        }

        // Apply the workspace edit using the VS Code API
        // This stages the changes in memory, doesn't necessarily save the files.
        const success = await vscode.workspace.applyEdit(workspaceEdit);

        if (!success) {
            // vscode.workspace.applyEdit might return false on failure
            // Or it might throw an error, which the outer catch block handles.
             throw new Error("vscode.workspace.applyEdit returned false.");
        }

        // Optional: Save affected documents. This is often desired after applying edits.
        // However, applying edits to many files might be slow if saving all immediately.
        // For simplicity, we won't auto-save here, letting the caller decide or relying on auto-save settings.
        // If you need to save specific documents, you'd need to track which URIs were modified.
        // Example to save all: await vscode.workspace.saveAll();

        console.log(`[Tool] applyWorkspaceEdit successfully applied changes.`);
        return { success: true, message: "Changes applied successfully." };

    } catch (error: any) {
        console.error("[Tool] Failed to apply workspace edit:", error);
        // Re-throw the error for ToolRunner to handle and display
        throw new Error(`Failed to apply changes: ${error.message || String(error)}`);
    }
}

// Define validation rules as properties on the function for ToolRunner
applyWorkspaceEdit.validateParams = (params: Record<string, any>): boolean | string => {
    if (!params.edits || !Array.isArray(params.edits)) {
        return 'Parameter "edits" (array) is required.';
    }
    // Add more detailed validation for the structure of edits array items
    for (const edit of params.edits) {
        if (typeof edit.file !== 'string' || !Array.isArray(edit.changes)) {
             return 'Each edit must have a "file" (string) and "changes" (array).';
        }
        // Validate the file path format (e.g., not absolute, maybe check for '../')
        if (path.isAbsolute(edit.file)) {
             return `File path "${edit.file}" must be relative to the workspace root.`;
        }
        if (edit.file.startsWith('../') || edit.file.includes('/../')) {
             return `File path "${edit.file}" must be within the workspace root.`;
        }


        for (const change of edit.changes) {
            if (!change.range || typeof change.newText !== 'string') {
                return 'Each change must have a "range" and "newText" (string).';
            }
            const range = change.range;
            // Validate range structure and values (basic check for non-negative numbers)
            if (!range.start || !range.end || typeof range.start.line !== 'number' || typeof range.start.character !== 'number' || typeof range.end.line !== 'number' || typeof range.end.character !== 'number' ||
                range.start.line < 0 || range.start.character < 0 || range.end.line < 0 || range.end.character < 0) {
                 return 'Range must have start/end with non-negative line/character numbers.';
            }
            // Optional: Check if start <= end (though VS Code Range constructor handles this)
        }
    }
    return true;
};

applyWorkspaceEdit.requiredParams = ['edits'];