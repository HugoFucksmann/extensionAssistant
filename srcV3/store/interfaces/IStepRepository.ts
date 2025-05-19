// src/store/interfaces/IStepRepository.ts
// MODIFIED: Corrected types for stepParams and result in ExecutionStepEntity.

import { IRepository } from "./IRepository";

// Define the entity structure for Execution Steps (to be saved)
export interface ExecutionStepEntity {
    id: string; // UUID for the step execution instance
    traceId: string; // Link to the trace/turn ID
    chatId: string; // Link to the conversation ID
    stepName: string; // Name from the ExecutionStep definition
    stepType: 'tool' | 'prompt'; // Type from the ExecutionStep definition
    stepExecute: string; // Tool name or Prompt type
    stepParams: Record<string, any>; // MODIFIED: Changed from string to Record<string, any>
    startTime: number;
    endTime?: number;
    status: 'running' | 'completed' | 'failed' | 'skipped'; // Execution status
    result?: any; // MODIFIED: Changed from string to any
    error?: string; // String representation of the error (if failed)
    // Add other relevant fields, like planning iteration, etc.
    planningIteration?: number;
}


/**
 * Repository interface for storing execution steps/trace information.
 */
export interface IStepRepository extends IRepository<ExecutionStepEntity> {
    // Add repository-specific methods if needed, e.g., getStepsForTrace(traceId: string)
     getStepsForTrace(traceId: string): Promise<ExecutionStepEntity[]>;
}