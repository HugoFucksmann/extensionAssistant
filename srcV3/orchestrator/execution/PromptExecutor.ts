// src/orchestrator/execution/PromptExecutor.ts

import { executeModelInteraction } from "../../models/promptSystem";
import { IExecutor, PromptType } from "./types"; // <-- Import PromptType from types.ts


/**
 * PromptExecutor implements the IExecutor interface for AI prompt-based actions.
 * It delegates to promptSystem for model interactions.
 */
export class PromptExecutor implements IExecutor {
  private readonly validPromptTypes: Set<string>;

  constructor() {
    // Initialize with all known prompt types from the PromptType union
    // Get all values from the PromptType union
    const allPromptTypes: PromptType[] = [
      'inputAnalyzer',
      'planningEngine',
      'editing',
      'examination',
      'projectManagement',
      'projectSearch',
      'resultEvaluator',
      'conversationResponder',
      'explainCodePrompt', // <-- New
      'fixCodePrompt', // <-- New
    ];
    this.validPromptTypes = new Set(allPromptTypes);
  }

  /**
   * Checks if this executor can handle the specified prompt action
   * @param action The prompt type to check
   * @returns true if the prompt type is recognized
   */
  canExecute(action: string): boolean {
    // Check if the action is a valid PromptType
    return this.validPromptTypes.has(action as PromptType);
  }

  /**
   * Executes the specified prompt with the provided parameters
   * @param action The prompt type to execute
   * @param params Parameters required by the prompt
   * @returns Promise resolving to the result of the model interaction
   */
  async execute(action: string, params: Record<string, any>): Promise<any> {
    // Cast action to PromptType as we've validated it in canExecute
    return executeModelInteraction(action as PromptType, params);
  }
}