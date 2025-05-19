// src/tools/project/searchWorkspace.ts
// MODIFIED: Implemented basic search using vscode.workspace.findFiles and simulated Location results.

import * as vscode from 'vscode';
import * as path from 'path';
import { SimplifiedLocation } from '../core/types'; // Import the simplified type

/**
 * Tool to search for a query within the workspace files.
 * Uses vscode.workspace.findFiles for a basic file name/path search.
 * Simulates returning SimplifiedLocation objects for found files.
 */
export async function searchWorkspace(params: { query: string }): Promise<SimplifiedLocation[]> {
    console.log(`[Tool] searchWorkspace called with query: "${params.query}"`);

    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
         console.warn("[Tool] searchWorkspace: No workspace folder open.");
         // Return empty array if no workspace
         return [];
    }

    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

    try {
        // Use vscode.workspace.findFiles. This searches file names and paths by default.
        // A more advanced search could read file contents, but this is a reasonable start.
        // The pattern '**/*' followed by the query searches for the query anywhere in the path/filename.
        // Adjust the pattern for more specific search needs.
        const uris = await vscode.workspace.findFiles(`**/*${params.query}*`, '**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/.vscode/**'); // Exclude common dirs

        console.log(`[Tool] searchWorkspace found ${uris.length} files for query "${params.query}".`);

        // Convert vscode.Uri results to SimplifiedLocation format.
        // Since findFiles doesn't give specific ranges *within* the file,
        // we'll simulate a dummy range (e.g., start of the file) for each found file.
        const results: SimplifiedLocation[] = uris.map(uri => {
            // Construct a dummy range (e.g., first line)
            const dummyRange = new vscode.Range(0, 0, 0, 0); // Represents position (0,0)

            return {
                uri: { fsPath: uri.fsPath },
                range: {
                    start: { line: dummyRange.start.line, character: dummyRange.start.character },
                    end: { line: dummyRange.end.line, character: dummyRange.end.character },
                },
            };
        });

        // Note: A true "search workspace" tool might need to read file contents and find actual matches,
        // returning multiple locations per file. This implementation is simpler, finding files by name/path.

        return results;

    } catch (error: any) {
        console.error(`[Tool] Error during searchWorkspace for query "${params.query}":`, error);
         // Return empty array and let the error propagate via the ToolAdapter/TraceService
        throw new Error(`Failed to search workspace: ${error.message || String(error)}`);
    }
}

// REMOVED: Old manual validation properties - Zod schema handles this now
// searchWorkspace.validateParams = (params: any) => true;
// searchWorkspace.requiredParams = ['query'];