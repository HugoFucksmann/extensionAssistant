// src/tools/project/searchWorkspace.ts

import * as vscode from 'vscode';

/**
 * Tool to search for a query within the workspace or specific files.
 * This is a placeholder implementation.
 */
export async function searchWorkspace(params: { query: string }): Promise<vscode.Location[]> {
    // Implementación simulada
    const dummyUri = vscode.Uri.file('/fake/path/to/file.txt');
    const dummyRange = new vscode.Range(0, 0, 0, 10);
    const dummyLocation = new vscode.Location(dummyUri, dummyRange);
    
    const dummyResults = params.query.toLowerCase().includes('error') ? [dummyLocation] : [];
    
    console.log(`[Tool] searchWorkspace returning ${dummyResults.length} results.`);
    return dummyResults;
}

// Interface requerida por ToolRunner
searchWorkspace.validateParams = (params: any) => true;
searchWorkspace.requiredParams = ['query'];