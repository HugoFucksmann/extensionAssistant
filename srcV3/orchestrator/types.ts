// src/orchestrator/execution/types.ts
// MODIFIED: Removed types related to manual StepExecutor and IExecutor pattern.

// import * as vscode from 'vscode'; // Keep if needed for types like vscode.WorkspaceEdit

export type PromptVariables = Record<string, any>; // Keep - generic type for variables

// Keep - Describes the output structure of the inputAnalyzer prompt
export interface InputAnalysisResult {
  intent: 'conversation' | 'explainCode' | 'fixCode' | 'unknown';
  objective: string;
  extractedEntities: {
    filesMentioned: string[];
    functionsMentioned: string[];
    errorsMentioned: string[];
    customKeywords: string[];
    [key: string]: any;
  };
  confidence: number;
  [key: string]: any;
}

// REMOVED: ExecutionStep - This was for the manual planning loop
// export interface ExecutionStep { ... }

// REMOVED: StepResult - This was for the manual step execution outcome
// export interface StepResult<T = any> { ... }

// REMOVED: IExecutor - This was for the manual executor registry
// export interface IExecutor { ... }

// Keep - Defines types for prompt system (PromptType union)
// --- Updated PromptType ---
export type PromptType =
  | 'inputAnalyzer'
  | 'editing' // Not used in provided code, but kept if part of broader system
  | 'examination' // Not used
  | 'projectManagement' // Not used
  | 'projectSearch' // Not used
  | 'resultEvaluator' // Not used
  | 'conversationResponder'
  | 'explainCodePrompt'
  | 'fixCodePrompt'
  | 'codeValidator'
  | 'planner';

// --- Standardized Prompt Variable Interfaces ---

/** Base interface for common variables available to most prompts. */
export interface BasePromptVariables {
  userMessage: string;
  chatHistory: string;
  objective?: string;
  extractedEntities?: InputAnalysisResult['extractedEntities'];
  projectContext?: any; // This will be the projectInfo from GlobalContextState
  activeEditorContent?: string; // Content of the active editor
  // Dynamic keys like fileContent:path/to/file, searchResults:query will be added by ContextResolver
  [key: `fileContent:${string}`]: string | undefined;
  [key: `searchResults:${string}`]: any | undefined;
  [key: string]: any; // Allow other dynamic variables from state
}

/**
 * Defines the structure for registering prompt templates and their variable builders.
 * REMOVED: This interface describes the PromptDefinition structure used *internally* by PromptService/metadata registry,
 * not a type used frequently outside that module. Metadata registry classes/interfaces are better located within the models module.
 * export interface PromptDefinition<T extends BasePromptVariables = BasePromptVariables> { ... }
 */


// --- Tool Parameter Interfaces ---
// Keep these as they define the expected *input shapes* for our tool functions.
// They are not directly used by LangChain/Zod in the same way, but useful for defining Zod schemas.
// We can keep them here or move them closer to the tool definitions/schemas.
// Let's move them closer to the tool schemas or definitions if this file is to be reduced.
// For now, keep them if other parts of the system still import them.
// REVIEW: Are these interfaces imported outside of tool definition/validation logic? If not, move them.
// Looking at the code, they seem primarily used for type hinting in the tool files themselves
// and as a conceptual base for Zod schemas. Let's move them to `src/tools/core/types.ts`.

// REMOVED: Tool Parameter Interfaces (Move to src/tools/core/types.ts)
// export interface FilesystemGetFileContentsParams { filePath: string; }
// export interface FilesystemGetWorkspaceFilesParams { /* No parameters needed */ }
// export interface EditorGetActiveEditorContentParams { /* No parameters needed */ }
// export interface ProjectGetPackageDependenciesParams { projectPath: string; }
// export interface ProjectGetProjectInfoParams { /* No parameters needed */ }
// export interface ProjectSearchWorkspaceParams { query: string; }
// export interface CodeManipulationApplyWorkspaceEditParams { edits: vscode.WorkspaceEdit[]; }

// REMOVED: Union type for all tool parameters
// export type ToolParams = ... ;

/**
 * Defines the structure for variables specifically for the planner prompt.
 * Extends BasePromptVariables.
 */
export interface PlannerPromptVariables extends BasePromptVariables {
  currentFlowState: Record<string, any>; // The entire resolution context snapshot
  availableTools: string; // Formatted string of tool names
  availablePrompts: string; // Formatted string of prompt types
  planningHistory: Array<{ action: string; result: any; error?: any; stepName: string; status: string; timestamp: number }>; // Detailed step history
  planningIteration: number;
}

/**
* Defines the expected output structure for the planner prompt.
* This is the instruction the model receives on how to format its response.
*/
export interface PlannerResponse {
  action: 'tool' | 'prompt' | 'respond';
  toolName?: string; // Required if action is 'tool'
  promptType?: PromptType; // Required if action is 'prompt'
  params?: Record<string, any>; // Parameters for the tool/prompt, or { messageToUser: string } for respond
  storeAs?: string; // Recommended for tool/prompt actions to store results in state
  reasoning: string;
  // Add optional error/feedback fields from the planner if it indicates a problem
  error?: string;
  feedbackToUser?: string;
}