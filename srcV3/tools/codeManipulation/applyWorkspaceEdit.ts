// src/tools/codeManipulation/applyWorkspaceEdit.ts
// MODIFIED: Implemented actual application of vscode.WorkspaceEdit.

import * as vscode from 'vscode';
import * as path from 'path'; // Needed for path.join

// Define interface for expected parameters (matches ApplyWorkspaceEditInputSchema)
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
}

/**
 * Tool to apply a set of text edits across multiple files in the workspace.
 * Constructs and applies a vscode.WorkspaceEdit.
 */
export async function applyWorkspaceEdit(params: ApplyWorkspaceEditParams): Promise<{ success: boolean, message: string }> {
    console.log(`[Tool] applyWorkspaceEdit called with ${params.edits.length} file edits.`);

    if (!params.edits || !Array.isArray(params.edits) || params.edits.length === 0) {
        console.warn("[Tool] applyWorkspaceEdit received no edits.");
        return { success: false, message: "No edits provided." };
    }

     if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
         console.error("[Tool] applyWorkspaceEdit: No workspace folder open. Cannot apply edits.");
         throw new Error("Cannot apply edits: No workspace folder open.");
     }

    const workspaceRootUri = vscode.workspace.workspaceFolders[0].uri;
    const workspaceEdit = new vscode.WorkspaceEdit();

    try {
        for (const fileEdit of params.edits) {
            // Construct the full file URI from the relative path
            const fileUri = vscode.Uri.joinPath(workspaceRootUri, fileEdit.file);

            for (const change of fileEdit.changes) {
                // Convert the simplified range to vscode.Range
                const range = new vscode.Range(
                    change.range.start.line, change.range.start.character,
                    change.range.end.line, change.range.end.character
                );

                // Add the edit to the workspace edit
                workspaceEdit.replace(fileUri, range, change.newText);
            }
        }

        console.log(`[Tool] Applying workspace edit with ${workspaceEdit.size} changes...`);
        // Apply the workspace edit
        const success = await vscode.workspace.applyEdit(workspaceEdit);

        if (success) {
            console.log(`[Tool] Workspace edit applied successfully.`);
            return { success: true, message: "Changes applied successfully." };
        } else {
             // applyEdit can fail if the document changed unexpectedly (e.g., user edited it)
            console.warn(`[Tool] Failed to apply workspace edit.`);
            // VS Code might show a notification to the user about the failure
            return { success: false, message: "Failed to apply changes. The file might have been modified externally." };
        }

    } catch (error: any) {
        console.error(`[Tool] Error during applyWorkspaceEdit:`, error);
         // Re-throw the error so the ToolAdapter/TraceService can catch and log it
        throw new Error(`Failed to apply workspace edit: ${error.message || String(error)}`);
    }
}

// REMOVED: Old manual validation properties - Zod schema handles this now
// applyWorkspaceEdit.validateParams = (params: Record<string, any>): boolean | string => { ... };
// applyWorkspaceEdit.requiredParams = ['edits'];