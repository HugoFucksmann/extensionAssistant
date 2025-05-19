// src/tools/core/types.ts
// Types related to tool inputs/outputs, used for defining Zod schemas and function signatures.

import * as vscode from 'vscode'; // Keep if needed for types like vscode.WorkspaceEdit, vscode.Location

// --- Tool Parameter Interfaces ---
export interface FilesystemGetFileContentsParams { filePath: string; }
export interface FilesystemGetWorkspaceFilesParams { /* No parameters needed */ }
export interface EditorGetActiveEditorContentParams { /* No parameters needed */ }
export interface ProjectGetPackageDependenciesParams { projectPath: string; }
export interface ProjectGetProjectInfoParams { /* No parameters needed */ }
// Simplified VS Code Location structure for serializable tool output
 export interface SimplifiedLocation {
      uri: { fsPath: string; };
      range: { start: { line: number, character: number }, end: { line: number, character: number } };
 }
export interface ProjectSearchWorkspaceParams { query: string; }
export interface ProjectSearchWorkspaceResult extends Array<SimplifiedLocation> {}


// Simplified VS Code WorkspaceEdit structure for serializable tool input
 export interface SimplifiedWorkspaceEdit {
     file: string; // Path relative to workspace root
     changes: Array<{
         range: { start: { line: number, character: number }, end: { line: number, character: number } };
         newText: string;
     }>;
 }
export interface CodeManipulationApplyWorkspaceEditParams { edits: SimplifiedWorkspaceEdit[]; }
export interface CodeManipulationApplyWorkspaceEditResult { success: boolean, message: string }


// Union type for all tool parameters (useful for generic handlers)
export type ToolParams =
  | FilesystemGetFileContentsParams
  | FilesystemGetWorkspaceFilesParams
  | EditorGetActiveEditorContentParams
  | ProjectGetPackageDependenciesParams
  | ProjectGetProjectInfoParams
  | ProjectSearchWorkspaceParams
  | CodeManipulationApplyWorkspaceEditParams;


// Union type for all tool results (useful for generic handlers)
export type ToolResult =
   | string // For getFileContents, getWorkspaceFiles (if stringified)
   | string[] // For getPackageDependencies, getWorkspaceFiles
   | { mainLanguage: string; secondaryLanguage?: string; dependencies: string[]; } // For getProjectInfo
   | { content: string; languageId: string; fileName: string; } | null // For getActiveEditorContent
   | ProjectSearchWorkspaceResult // For searchWorkspace
   | CodeManipulationApplyWorkspaceEditResult; // For applyWorkspaceEdit