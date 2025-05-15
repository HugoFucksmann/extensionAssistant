// src/orchestrator/execution/types.ts

import * as vscode from 'vscode';
import { FlowContext } from '../context/flowContext';
import { StepExecutor } from './stepExecutor';
import { TerminalRunCommandParams as TerminalRunCommandParamsImport } from '../../tools/terminal/runCommand';
import { FilesystemCreateFileParams as FilesystemCreateFileParamsImport } from '../../tools/filesystem/createFile'; // Import new tool params
import { FilesystemCreateDirectoryParams as FilesystemCreateDirectoryParamsImport } from '../../tools/filesystem/createDirectory'; // Import new tool params
import { ProjectInstallDependenciesParams as ProjectInstallDependenciesParamsImport } from '../../tools/project/installDependencies'; // Import new tool params
import { ProjectAddDependencyParams as ProjectAddDependencyParamsImport } from '../../tools/project/addDependency'; // Import new tool params


export type PromptVariables = Record<string, any>;

export interface InputAnalysisResult {
  intent: 'conversation' | 'explainCode' | 'fixCode' | 'unknown' | 'search' | 'console' | 'editing' | 'examination' | 'projectManagement'; // 'projectManagement' is here
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

// --- New: Agent Interface ---
/**
 * Represents a specialized agent responsible for handling a specific intent.
 * Agents receive the FlowContext and use the StepExecutor (provided in constructor)
 * to run steps to fulfill their intent.
 */
export interface IAgent {
    /**
     * Executes the logic for this agent based on the FlowContext.
     * @param flowContext The context for the current turn.
     * @returns A Promise resolving to the final response content (string or any data).
     */
    execute(flowContext: FlowContext): Promise<string | any>;
}


// --- Updated PromptType ---
// Define types for prompt system
export type PromptType =
  | 'inputAnalyzer'
  | 'editing' // Intent type
  | 'examination' // Intent type
  | 'projectManagement' // Intent type
  | 'projectSearch' // Intent type (Note: SearchAgent handles this)
  | 'resultEvaluator'
  | 'conversationResponder'
  | 'explainCodePrompt'
  | 'fixCodePrompt'
  | 'codeValidator'
  | 'planner' // General planner (used by UnknownIntentAgent)
  | 'searchResultsFormatter'
  | 'fixCodePlanner' // Agent-specific planner
  | 'consoleCommandFormatter'
  | 'editingPrompt'
  | 'examinationResultsFormatter'
  | 'projectManagementParamsFormatter'; // New prompt type


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
export interface CodeManipulationApplyWorkspaceEditParams { edits: vscode.WorkspaceEdit[]; } // Expects a VS Code WorkspaceEdit structure
export type TerminalRunCommandParams = TerminalRunCommandParamsImport;
export type FilesystemCreateFileParams = FilesystemCreateFileParamsImport; // Add new tool params
export type FilesystemCreateDirectoryParams = FilesystemCreateDirectoryParamsImport; // Add new tool params
export type ProjectInstallDependenciesParams = ProjectInstallDependenciesParamsImport; // Add new tool params
export type ProjectAddDependencyParams = ProjectAddDependencyParamsImport; // Add new tool params


// Union type for all tool parameters
export type ToolParams =
  | FilesystemGetFileContentsParams
  | FilesystemGetWorkspaceFilesParams
  | EditorGetActiveEditorContentParams
  | ProjectGetPackageDependenciesParams
  | ProjectGetProjectInfoParams
  | ProjectSearchWorkspaceParams
  | CodeManipulationApplyWorkspaceEditParams
  | TerminalRunCommandParams
  | FilesystemCreateFileParams // Add to union
  | FilesystemCreateDirectoryParams // Add to union
  | ProjectInstallDependenciesParams // Add to union
  | ProjectAddDependencyParams; // Add to union


/**
 * Defines the structure for variables specifically for the general planner prompt.
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
* Defines the expected output structure for the general planner prompt.
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

// --- FixCodePlanner Specifics ---

/**
 * Defines the structure for variables specifically for the fixCodePlanner prompt.
 * Extends BasePromptVariables and includes fix-code-specific context.
 */
export interface FixCodePlannerPromptVariables extends BasePromptVariables {
    currentFlowState: Record<string, any>; // Full context state is useful
    planningHistory: Array<{ action: string; result: any; error?: any; stepName: string }>; // History for this agent's steps
    fixCodeIteration: number; // Current iteration within the fix process
    // Add specific keys for easier access in the prompt template
    originalCodeContent?: string; // The code being fixed
    proposedFixResult?: any; // Result from the fixCodePrompt
    validationResult?: any; // Result from the codeValidator
    // Add other relevant context like errors, file paths, etc.
    targetFilePath?: string; // The path of the file being fixed
    analysisResult?: InputAnalysisResult; // Full analysis result
}

/**
 * Defines the expected output structure for the fixCodePlanner prompt.
 * Can reuse PlannerResponse structure or define a more specific one.
 * Let's reuse PlannerResponse for consistency in action types ('tool', 'prompt', 'respond').
 */
export type FixCodePlannerResponse = PlannerResponse;

// --- ConsoleCommandFormatter Specifics ---

/**
 * Defines the structure for variables specifically for the consoleCommandFormatter prompt.
 * Extends BasePromptVariables and includes console-specific context.
 */
export interface ConsoleCommandFormatterPromptVariables extends BasePromptVariables {
    // Add specific keys for easier access in the prompt template
    commandObjective: string; // The specific task the command should achieve
    // Include any extracted entities relevant to command parameters (e.g., package name, file name)
    extractedEntities?: InputAnalysisResult['extractedEntities'];
}

// --- EditingPrompt Specifics ---

/**
 * Defines the structure for variables specifically for the editingPrompt.
 * Extends BasePromptVariables and includes editing-specific context.
 */
export interface EditingPromptVariables extends BasePromptVariables {
    editingObjective: string; // The specific task the edit should achieve
    // Include relevant code content
    codeContentToEdit?: string;
    targetFilePath?: string; // The path of the file being edited
    // Include any extracted entities relevant to the edit (e.g., function name, line number)
    extractedEntities?: InputAnalysisResult['extractedEntities'];
}

/**
 * Defines the expected output structure for the editingPrompt.
 * This prompt is expected to return a JSON object that represents a vscode.WorkspaceEdit.
 * The structure should match the JSON serialization of vscode.WorkspaceEdit.
 */
export interface EditingPromptResponse {
    documentChanges?: Array<{
        textDocument: { uri: string; version?: number };
        edits: Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>;
    }>;
    changes?: Record<string, Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>>;
}

// --- ExaminationResultsFormatter Specifics ---

/**
 * Defines the structure for variables specifically for the examinationResultsFormatter prompt.
 * Extends BasePromptVariables and includes examination-specific context.
 */
export interface ExaminationResultsFormatterPromptVariables extends BasePromptVariables {
    examinationObjective: string; // The specific task the examination should achieve
    // Include results from examination tools
    projectInfoResult?: any; // Result from project.getProjectInfo
    packageDependenciesResult?: any; // Result from project.getPackageDependencies
    // Add other examination results here as tools are added (e.g., code analysis results)
    // codeAnalysisResult?: any;
}

// --- ProjectManagementParamsFormatter Specifics ---

/**
 * Defines the structure for variables specifically for the projectManagementParamsFormatter prompt.
 * Extends BasePromptVariables and includes project management-specific context.
 */
export interface ProjectManagementParamsFormatterVariables extends BasePromptVariables {
    projectManagementObjective: string; // The specific task the project management action should achieve
    // Include any extracted entities relevant to the action (e.g., file name, directory name, package name)
    extractedEntities?: InputAnalysisResult['extractedEntities'];
    // Include project context for deciding package manager, paths, etc.
    projectContext?: any;
    // Include any previous steps or context that helps determine parameters
    // currentFlowState: Record<string, any>; // Could include full state if needed
}

/**
 * Defines the expected output structure for the projectManagementParamsFormatter prompt.
 * This prompt is expected to return a JSON object containing the parameters
 * for a specific project management tool call.
 * The structure will vary depending on the target tool.
 * Example for creating a file: { "filePath": "src/utils/helper.js", "content": "// helper function\n" }
 * Example for adding a dependency: { "packageName": "axios", "dev": false }
 */
export interface ProjectManagementParamsFormatterResponse {
    // This needs to be flexible to match different tool parameter interfaces.
    // Using Record<string, any> for flexibility, but the prompt instructions
    // must be very clear about the expected keys/types for each *type* of action.
    // A more advanced approach might involve the prompt returning the tool name *and* params.
    // For now, let's assume the agent already knows *which* tool to call and just needs the params formatted.
    [key: string]: any;
}