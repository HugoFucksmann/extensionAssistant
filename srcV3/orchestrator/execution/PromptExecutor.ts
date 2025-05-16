// src/orchestrator/execution/PromptExecutor.ts

import { executeModelInteraction } from "../../models/promptSystem";
import { IExecutor, PromptType } from "./types";

/**
 * PromptExecutor implements the IExecutor interface for AI prompt-based actions.
 * It delegates to promptSystem for model interactions.
 */
export class PromptExecutor implements IExecutor {
  private readonly validPromptTypes: Set<string>;

  constructor() {
    // Initialize with all known prompt types from the PromptType union
    const allPromptTypes: PromptType[] = [
      'inputAnalyzer',
      'conversationResponder',
      'explainCodePrompt',
      'fixCodePrompt',
      'codeValidator',
      'planner',
    ];
    this.validPromptTypes = new Set(allPromptTypes);
    // console.log('[PromptExecutor] Initialized with valid prompt types:', Array.from(this.validPromptTypes)); // Reduced logging
  }

  /**
   * Checks if this executor can handle the specified prompt action
   * @param action The prompt type to check
   * @returns true if the prompt type is recognized
   */
  canExecute(action: string): boolean {
    return this.validPromptTypes.has(action as PromptType);
  }

  /**
   * Executes the specified prompt with the provided parameters.
   * For PromptExecutor, the 'params' parameter is the full resolution context data.
   * @param action The prompt type to execute
   * @param fullContextData The full resolution context data from FlowContext
   * @returns Promise resolving to the result of the model interaction
   */
  async execute(action: string, fullContextData: Record<string, any>): Promise<any> {
    return executeModelInteraction(action as PromptType, fullContextData);
  }
}