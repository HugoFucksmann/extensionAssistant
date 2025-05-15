// src/orchestrator/execution/PromptExecutor.ts

import { executeModelInteraction, getPromptDefinitions } from "../../models/promptSystem"; // Import getPromptDefinitions
import { IExecutor, PromptType } from "./types";

/**
 * PromptExecutor implements the IExecutor interface for AI prompt-based actions.
 * It delegates to promptSystem for model interactions.
 */
export class PromptExecutor implements IExecutor {
  private readonly validPromptTypes: Set<string>;

  constructor() {
    // Get valid prompt types from the prompt system's definitions
    const promptDefinitions = getPromptDefinitions();
    this.validPromptTypes = new Set(Object.keys(promptDefinitions));
    console.log('[PromptExecutor] Initialized with valid prompt types:', Array.from(this.validPromptTypes)); // Logging valid types
  }

  /**
   * Checks if this executor can handle the specified prompt action
   * @param action The prompt type to check
   * @returns true if the prompt type is recognized based on registered definitions
   */
  canExecute(action: string): boolean {
    return this.validPromptTypes.has(action);
  }

  /**
   * Executes the specified prompt with the provided parameters.
   * For PromptExecutor, the 'params' parameter is the full resolution context data.
   * @param action The prompt type to execute
   * @param fullContextData The full resolution context data from FlowContext
   * @returns Promise resolving to the result of the model interaction
   */
  async execute(action: string, fullContextData: Record<string, any>): Promise<any> {
    // Ensure the action is a valid PromptType before casting
    if (!this.validPromptTypes.has(action)) {
        throw new Error(`Attempted to execute unknown prompt type: ${action}`);
    }
    return executeModelInteraction(action as PromptType, fullContextData);
  }
}