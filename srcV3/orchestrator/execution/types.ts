// src/orchestrator/execution/types.ts



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

// Define the expected structure for input analysis (can also be defined here)
export interface InputAnalysisResult {
  intent: 'conversation' | 'explainCode' | 'fixCode' | 'unknown'; // Added 'unknown'
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