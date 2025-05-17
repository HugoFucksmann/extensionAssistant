// src/tools/project/searchWorkspace.ts

import * as vscode from 'vscode';

/**
 * Tool to search for a query within the workspace.
 * Uses VS Code's built-in search functionality.
 * @param params - Parameters including the search query.
 * @returns An array of vscode.Location objects representing search results.
 * @throws Error if the search operation fails.
 */
export async function searchWorkspace(params: { query: string }): Promise<vscode.Location[]> {
    const { query } = params;
    console.log(`[Tool] searchWorkspace called with query: "${query}"`);

    if (!query || typeof query !== 'string') {
       
        throw new Error('Parameter "query" (string) is required.');
    }

    try {
        const locations: vscode.Location[] = [];
        
     
        const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
        
     
        for (const file of files) {
            try {
                const document = await vscode.workspace.openTextDocument(file);
                const text = document.getText();
                const lines = text.split('\n');
                
                // Simple text search (case insensitive)
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const index = line.toLowerCase().indexOf(query.toLowerCase());
                    if (index >= 0) {
                        const startPos = new vscode.Position(i, index);
                        const endPos = new vscode.Position(i, index + query.length);
                        const range = new vscode.Range(startPos, endPos);
                        locations.push(new vscode.Location(file, range));
                    }
                }
            } catch (error) {
                console.warn(`Could not read file ${file.fsPath}:`, error);
            }
        }
        
        console.log(`[Tool] searchWorkspace found ${locations.length} results for query "${query}".`);
        return locations;
    } catch (error) {
        console.error(`[Tool] Error during searchWorkspace execution for query "${query}":`, error);
     
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Workspace search failed for query "${query}": ${errorMessage}`);
    }
}

// Define validation rules as properties on the function for ToolRunner
searchWorkspace.validateParams = function(params: Record<string, any>): boolean | string {
    if (!params.query || typeof params.query !== 'string') {
        return 'Parameter "query" (string) is required.';
    }
    return true;
};

searchWorkspace.requiredParams = ['query'];