// src/orchestrator/execution/types.ts

// ... (other interfaces)

// Define the expected structure for input analysis
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
  /** Parameters for the tool or prompt. Can contain {{placeholder}} patterns. */
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
   * @param params Parameters required by the action
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
  | 'planningEngine'
  | 'editing'
  | 'examination'
  | 'projectManagement'
  | 'projectSearch'
  | 'resultEvaluator'
  | 'conversationResponder'
  | 'explainCodePrompt' // <-- New
  | 'fixCodePrompt'; // <-- New

// Type for variables that can be passed to prompts
export type PromptVariables = Record<string, any>;