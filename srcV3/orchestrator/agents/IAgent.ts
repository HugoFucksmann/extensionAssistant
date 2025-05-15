// src/orchestrator/agents/IAgent.ts

import { FlowContext } from '../context/flowContext';

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