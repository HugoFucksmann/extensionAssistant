// src/tools/core/toolMetadata.ts
import { z, ZodSchema } from 'zod';
// Import actual tool functions
import * as filesystemTools from '../filesystem';
import * as editorTools from '../editor';
import * as projectTools from '../project';
import * as codeManipulationTools from '../codeManipulation';
// Import tool schemas
import {
    GetWorkspaceFilesInputSchema, GetWorkspaceFilesOutputSchema,
    GetFileContentsInputSchema, GetFileContentsOutputSchema
} from '../../validation/schemas/tools/filesystem';
import {
    GetActiveEditorContentInputSchema, GetActiveEditorContentOutputSchema
} from '../../validation/schemas/tools/editor';
import {
    GetPackageDependenciesInputSchema, GetPackageDependenciesOutputSchema,
    GetProjectInfoInputSchema, GetProjectInfoOutputSchema,
    SearchWorkspaceInputSchema, SearchWorkspaceOutputSchema
} from '../../validation/schemas/tools/project';
 import {
     ApplyWorkspaceEditInputSchema, ApplyWorkspaceEditOutputSchema
 } from '../../validation/schemas/tools/codeManipulation';


// Define interface for tool metadata
export interface ToolMetadata {
    name: string; // Full tool name (e.g., 'filesystem.getFileContents')
    description: string; // Description for the LLM
    func: (...args: any[]) => Promise<any>; // The actual tool function
    inputSchema: ZodSchema<any>; // Zod schema for input validation
    outputSchema?: ZodSchema<any>; // Optional Zod schema for output validation
}

// Central registry for all tools
const TOOL_REGISTRY: Map<string, ToolMetadata> = new Map();

// Helper to add tools
function registerTool(metadata: ToolMetadata): void {
     if (TOOL_REGISTRY.has(metadata.name)) {
         console.warn(`[ToolMetadata] Tool "${metadata.name}" already registered. Overwriting.`);
     }
    TOOL_REGISTRY.set(metadata.name, metadata);
}

// Register all tools with their metadata and schemas
registerTool({
    name: 'filesystem.getWorkspaceFiles',
    description: 'Lists all files in the workspace, excluding common directories like node_modules, build, etc. Useful to understand the project structure.',
    func: filesystemTools.getWorkspaceFiles,
    inputSchema: GetWorkspaceFilesInputSchema,
    outputSchema: GetWorkspaceFilesOutputSchema,
});

registerTool({
    name: 'filesystem.getFileContents',
    description: 'Reads the content of a specific file given its path relative to the workspace root. Use this to get code or text from files.',
    func: filesystemTools.getFileContents,
    inputSchema: GetFileContentsInputSchema,
    outputSchema: GetFileContentsOutputSchema,
});

registerTool({
     name: 'editor.getActiveEditorContent',
     description: 'Gets the content, language ID, and file name of the currently active text editor. Use this when the user\'s request refers to the code they are currently viewing.',
     func: editorTools.getActiveEditorContent,
     inputSchema: GetActiveEditorContentInputSchema,
     outputSchema: GetActiveEditorContentOutputSchema,
});

 registerTool({
    name: 'project.getPackageDependencies',
    description: 'Gets the list of dependencies from the package.json file in the workspace root. Useful to understand project libraries.',
    func: projectTools.getPackageDependencies,
    inputSchema: GetPackageDependenciesInputSchema,
    outputSchema: GetPackageDependenciesOutputSchema,
 });

 registerTool({
     name: 'project.getProjectInfo',
     description: 'Gets general information about the project, including detected main languages and package dependencies. Useful for initial project understanding.',
     func: projectTools.getProjectInfo,
     inputSchema: GetProjectInfoInputSchema,
     outputSchema: GetProjectInfoOutputSchema,
 });

 registerTool({
     name: 'project.searchWorkspace',
     description: 'Searches the workspace for a given query string. Useful for finding symbols, error messages, or relevant code snippets across files.',
     func: projectTools.searchWorkspace,
     inputSchema: SearchWorkspaceInputSchema,
     outputSchema: SearchWorkspaceOutputSchema,
 });

 registerTool({
     name: 'codeManipulation.applyWorkspaceEdit',
     description: 'Applies a set of text edits to one or more files in the workspace. Use this tool carefully after proposing and validating code changes. Expects an array of file edits with ranges and new text.',
     func: codeManipulationTools.applyWorkspaceEdit,
     inputSchema: ApplyWorkspaceEditInputSchema,
     outputSchema: ApplyWorkspaceEditOutputSchema, // Optional, but good for confirmation
 });


/**
 * Get the metadata for a specific tool.
 */
export function getToolMetadata(name: string): ToolMetadata | undefined {
    return TOOL_REGISTRY.get(name);
}

/**
 * Get metadata for all registered tools.
 */
export function getAllToolMetadata(): ToolMetadata[] {
    return Array.from(TOOL_REGISTRY.values());
}

 /**
  * List the names of all registered tools.
  */
 export function listTools(): string[] {
     return Array.from(TOOL_REGISTRY.keys());
 }