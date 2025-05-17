// src/tools/codeManipulation/applyWorkspaceEdit.ts

import * as vscode from 'vscode';
import * as path from 'path'; // Needed for path.join
import {  normalizePath } from '../core/core'; // Import core utilities


interface ApplyWorkspaceEditParams {
    edits: Array<{
        file: string;
        changes: Array<{
            range: { start: { line: number, character: number }, end: { line: number, character: number } };
            newText: string;
        }>;
    }>;

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

   
    if (!params.edits || !Array.isArray(params.edits) || params.edits.length === 0) {
      
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

      
        for (const fileEdit of params.edits) {
            
            const uri = vscode.Uri.joinPath(workspaceRootUri, normalizePath(fileEdit.file));

          
            for (const change of fileEdit.changes) {
           
                const range = new vscode.Range(
                    change.range.start.line, change.range.start.character,
                    change.range.end.line, change.range.end.character
                );

               
                workspaceEdit.replace(uri, range, change.newText);
            }
        }

       
        const success = await vscode.workspace.applyEdit(workspaceEdit);

        if (!success) {
          
             throw new Error("vscode.workspace.applyEdit returned false.");
        }

       

        console.log(`[Tool] applyWorkspaceEdit successfully applied changes.`);
        return { success: true, message: "Changes applied successfully." };

    } catch (error: any) {
        console.error("[Tool] Failed to apply workspace edit:", error);
       
        throw new Error(`Failed to apply changes: ${error.message || String(error)}`);
    }
}


applyWorkspaceEdit.validateParams = (params: Record<string, any>): boolean | string => {
    if (!params.edits || !Array.isArray(params.edits)) {
        return 'Parameter "edits" (array) is required.';
    }
   
    for (const edit of params.edits) {
        if (typeof edit.file !== 'string' || !Array.isArray(edit.changes)) {
             return 'Each edit must have a "file" (string) and "changes" (array).';
        }
     
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
           
            if (!range.start || !range.end || typeof range.start.line !== 'number' || typeof range.start.character !== 'number' || typeof range.end.line !== 'number' || typeof range.end.character !== 'number' ||
                range.start.line < 0 || range.start.character < 0 || range.end.line < 0 || range.end.character < 0) {
                 return 'Range must have start/end with non-negative line/character numbers.';
            }
           
        }
    }
    return true;
};

applyWorkspaceEdit.requiredParams = ['edits'];