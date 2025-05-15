import * as vscode from 'vscode';

export type PromptVariables = Record<string, any>;

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

/**
 * Define a single step in an execution flow.
 * Can be a tool call or a model prompt interaction.
 */
export interface ExecutionStep {
  /** Unique name for this step within its context (useful for logging/debugging). */
  name: string;
  /** The type of execution: 'tool' or 'prompt'. */
  type: 'tool' | 'prompt';
  /** The specific tool name or prompt type to execute. */
  execute: string; // e.g., 'filesystem.getFileContents' or 'inputAnalyzer'
  /** Parameters for the tool or prompt. Can contain {{placeholder}} patterns for tool steps. For prompt steps, these are non-contextual config params. */
  params?: Record<string, any>;
  /** Optional condition function to determine if this step should run. Checks against the context data used for parameter resolution. */
  condition?: (contextData: Record<string, any>) => boolean;
  /** Key in the FlowContext to store the successful result of this step. */
  storeAs?: string;
  /** Optional: Timeout for the step in milliseconds. */
  timeout?: number;
}

/**
 * Represents the outcome of executing a single step.
 */
export interface StepResult<T = any> {
    /** Indicates if the step completed successfully. */
    success: boolean;
    /** The actual result from the tool/prompt if successful. */
    result?: T;
    /** The error object if the step failed. */
    error?: any;
    /** Timestamp when the step finished. */
    timestamp: number;
    /** Reference to the step definition that was executed. */
    step: ExecutionStep;
    /** If the step was skipped due to a condition. */
    skipped?: boolean;
}

export interface IExecutor {
  /**
   * Executes the specified action with the provided parameters
   * @param action The action identifier to execute
   * @param params Parameters required by the action. For prompt executors, this is the full context data.
   * @returns Promise resolving to the result of the execution
   */
  execute(action: string, params: Record<string, any>): Promise<any>;

  /**
   * Checks if this executor can handle the specified action
   * @param action The action identifier to check
   * @returns true if this executor can handle the action, false otherwise
   */
  canExecute(action: string): boolean;
}

// --- Updated PromptType ---
// Define types for prompt system
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
  | 'planner'; // Removed planningEngine alias

// --- Standardized Prompt Variable Interfaces ---

/** Base interface for common variables available to most prompts. */
export interface BasePromptVariables {
  userMessage: string;
  chatHistory: string;
  objective?: string;
  extractedEntities?: InputAnalysisResult['extractedEntities'];
  projectContext?: any;
  activeEditorContent?: string;
  [key: `fileContent:${string}`]: string | undefined;
  [key: `searchResults:${string}`]: any | undefined;
  [key: string]: any; // Allow other dynamic variables
}

/**
 * Defines the structure for registering prompt templates and their variable builders.
 */
export interface PromptDefinition<T extends BasePromptVariables = BasePromptVariables> {
  template: string;
  buildVariables: (resolutionContextData: Record<string, any>) => T;
}

// --- Tool Parameter Interfaces ---
// Kept as is, assuming they are used by ToolRunner implementations

export interface FilesystemGetFileContentsParams { filePath: string; }
export interface FilesystemGetWorkspaceFilesParams { /* No parameters needed */ }
export interface EditorGetActiveEditorContentParams { /* No parameters needed */ }
export interface ProjectGetPackageDependenciesParams { projectPath: string; }
export interface ProjectGetProjectInfoParams { /* No parameters needed */ }
export interface ProjectSearchWorkspaceParams { query: string; }
export interface CodeManipulationApplyWorkspaceEditParams { edits: vscode.WorkspaceEdit[]; }

// Union type for all tool parameters
export type ToolParams =
  | FilesystemGetFileContentsParams
  | FilesystemGetWorkspaceFilesParams
  | EditorGetActiveEditorContentParams
  | ProjectGetPackageDependenciesParams
  | ProjectGetProjectInfoParams
  | ProjectSearchWorkspaceParams
  | CodeManipulationApplyWorkspaceEditParams;

/**
 * Defines the structure for variables specifically for the planner prompt.
 * Extends BasePromptVariables.
 */
export interface PlannerPromptVariables extends BasePromptVariables {
  currentFlowState: Record<string, any>;
  availableTools: string;
  availablePrompts: string;
  planningHistory: Array<{ action: string; result: any; error?: any; stepName: string }>;
  planningIteration: number;
}

/**
* Defines the expected output structure for the planner prompt.
* This is the instruction the model receives on how to format its response.
*/
export interface PlannerResponse {
  action: 'tool' | 'prompt' | 'respond';
  toolName?: string;
  promptType?: PromptType;
  params?: Record<string, any>;
  storeAs?: string;
  reasoning: string;
}