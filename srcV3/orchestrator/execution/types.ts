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
    [key: string]: any; // Allow other entities
  };
  confidence: number;
  [key: string]: any; // Allow other analysis data
}

// Define a single step in an execution flow.
// Can be a tool call or a model prompt interaction.
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
  /** Key in the InteractionContext to store the successful result of this step. */
  storeAs?: string;
  /** Optional: Timeout for the step in milliseconds. */
  timeout?: number;
  // Add other properties as needed (e.g., retries, error handling behavior)
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
  | 'planningEngine' // Could use this alias for 'planner'
  | 'editing'
  | 'examination'
  | 'projectManagement'
  | 'projectSearch'
  | 'resultEvaluator'
  | 'conversationResponder'
  | 'explainCodePrompt'
  | 'fixCodePrompt'
  | 'codeValidator'
  | 'planner'; 
// --- Standardized Prompt Variable Interfaces ---

/** Base interface for common variables available to most prompts. */
export interface BasePromptVariables {
  userMessage: string; // The current user's message
  chatHistory: string; // Recent conversation history (formatted string)
  objective?: string; // The user's overall objective for the turn/session
  extractedEntities?: InputAnalysisResult['extractedEntities']; // Entities extracted from user input
  projectContext?: any; // Information about the current project/workspace
  activeEditorContent?: string; // Content of the active text editor
  [key: `fileContent:${string}`]: string | undefined; // Content of specific files, keyed by a sanitized path
  [key: `searchResults:${string}`]: any | undefined; // Results from search operations, keyed by query/identifier
  // Add other common keys as needed
}

/**
 * Defines the structure for registering prompt templates and their variable builders.
 * Used in promptSystem.ts
 */
export interface PromptDefinition<T extends BasePromptVariables = BasePromptVariables> {
  template: string;
  // buildVariables now receives the flattened resolution context data
  buildVariables: (resolutionContextData: Record<string, any>) => T;
}

// --- Tool Parameter Interfaces ---

export interface FilesystemGetFileContentsParams {
  filePath: string;
}

export interface FilesystemGetWorkspaceFilesParams {
  // No parameters needed
}

export interface EditorGetActiveEditorContentParams {
  // No parameters needed
}

export interface ProjectGetPackageDependenciesParams {
  projectPath: string;
}

export interface ProjectGetProjectInfoParams {
  // No parameters needed
}

export interface ProjectSearchWorkspaceParams {
  query: string;
}

export interface CodeManipulationApplyWorkspaceEditParams {
  edits: vscode.WorkspaceEdit[];
}

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
  currentFlowState: Record<string, any>; // The current state of the FlowContext (results of previous steps)
  availableTools: string; // Description/list of available tools
  availablePrompts: string; // Description/list of available prompts (excluding planner itself)
  planningHistory: Array<{ action: string; result: any; error?: any; stepName: string }>; // History of planning decisions and step results in this flow
  planningIteration: number; // Current iteration number of the planning loop
}


/**
* Defines the expected output structure for the planner prompt.
* This is the instruction the model receives on how to format its response.
*/
export interface PlannerResponse {
  action: 'tool' | 'prompt' | 'respond';
  toolName?: string; // Required if action is 'tool'
  promptType?: PromptType; // Required if action is 'prompt'
  params?: Record<string, any>; // Parameters for the tool/prompt/respond
  storeAs?: string; // Optional key to store the result of the tool/prompt execution in FlowContext
  reasoning: string; // Explanation for the chosen action
  // Add optional fields for debugging or UI hints
  // uiMessage?: string; // Message to show the user while executing this step
}