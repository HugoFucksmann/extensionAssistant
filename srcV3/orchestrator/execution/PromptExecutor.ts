// src/orchestrator/execution/PromptExecutor.ts

import { executeModelInteraction } from "../../models/promptSystem";
// Import PromptType from the central types file
import { IExecutor, PromptType } from "./types";


/**
 * PromptExecutor implements the IExecutor interface for AI prompt-based actions.
 * It delegates to promptSystem for model interactions.
 */
export class PromptExecutor implements IExecutor {
  private readonly validPromptTypes: Set<string>;

  constructor() {
    // Initialize with all known prompt types from the PromptType union
    // Make sure 'planner' is included here
    const allPromptTypes: PromptType[] = [
      'inputAnalyzer',
      'resultEvaluator',
      'conversationResponder',
      'explainCodePrompt',
      'fixCodePrompt',
      'codeValidator',
      'planner' // <--- Add 'planner' here
    ];
    this.validPromptTypes = new Set(allPromptTypes);
    console.log('[PromptExecutor] Initialized with valid prompt types:', Array.from(this.validPromptTypes));
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
   * Executes the specified prompt with the provided parameters.
   * For PromptExecutor, the 'params' parameter is the full resolution context data.
   * @param action The prompt type to execute
   * @param fullContextData The full resolution context data from InteractionContext (now FlowContext)
   * @returns Promise resolving to the result of the model interaction
   */
  async execute(action: string, fullContextData: Record<string, any>): Promise<any> {
    // Cast action to PromptType as we've validated it in canExecute
    // Pass the full context data directly to executeModelInteraction
    return executeModelInteraction(action as PromptType, fullContextData);
  }
}