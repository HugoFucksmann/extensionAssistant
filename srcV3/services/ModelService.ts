// src/models/ModelService.ts

import * as vscode from 'vscode';
// Import the updated PromptDefinition type and PROMPT_DEFINITIONS
import { PromptDefinition, PromptType } from '../orchestrator/execution/types'; // Ensure PromptDefinition is imported correctly
import { IModelService } from '../models/interfaces'; // Import the updated IModelService
import { ModelManager } from '../models/config/ModelManager';
// Import the utilities, including PROMPT_DEFINITIONS, fillPromptTemplate, etc.
import { fillPromptTemplate, PROMPT_DEFINITIONS } from '../models/promptSystem'; // Assuming promptSystem.ts now holds these
import { parseModelResponse } from '../models/config/modelUtils';
import { ModelType } from '../models/config/types';

import { IToolRunner } from '../tools/core/interfaces'; // Import IToolRunner

// Removed buildPromptVariablesHelper as logic is moved to executePrompt

export class ModelService implements IModelService {
  private modelManager: ModelManager;
  private disposables: vscode.Disposable[] = [];
  private toolRunner: IToolRunner; // Add toolRunner as an instance property

  // Accept IToolRunner dependency
  constructor(modelManager: ModelManager, toolRunner: IToolRunner) { // <-- Add toolRunner to constructor
    this.modelManager = modelManager;
    this.toolRunner = toolRunner; // <-- Store toolRunner
    console.log('[ModelService] Initialized with ModelManager and ToolRunner.');
  }

  /**
   * Executes a specific prompt type using the configured model.
   * Handles variable building, template filling, model request, and response parsing.
   */
  public async executePrompt<T = any>(
    type: PromptType,
    contextData: Record<string, any>
  ): Promise<T> {
    console.log(`[ModelService] Executing prompt type: ${type}`);

    // Get the definition from the central map
    const definition = PROMPT_DEFINITIONS[type];
    if (!definition) {
      throw new Error(`Unknown prompt type: ${type}`);
    }

    try {
        // --- Build Variables ---
        let variables;
        // Check if the specific builder function exists and if it requires toolRunner
        // A more robust way is to check the function's signature or have a flag,
        // but for now, we know *only* the planner builder needs toolRunner.
        if (type === 'planner') {
             // Explicitly pass toolRunner to the planner prompt builder
             variables = definition.buildVariables(contextData, this.toolRunner);
        } else {
             // Call other builders with only contextData
             variables = definition.buildVariables(contextData);
        }

        // --- Fill Template ---
        // Use the generic utility function
        const filledPrompt = fillPromptTemplate(definition.template, variables);

        // --- Send to Model ---
        const rawResponse = await this.modelManager.sendPrompt(filledPrompt);

        // --- Parse Response ---
        // Use the generic utility function
        return parseModelResponse<T>(type, rawResponse);

    } catch (error: any) {
        console.error(`[ModelService] Error during prompt execution for type ${type}:`, error);
        // Wrap the error for consistent handling upstream
        throw new Error(`Failed to execute model prompt (${type}): ${error.message || String(error)}`);
    }
  }

  /**
   * Changes the currently configured AI model.
   */
  public async changeModel(modelType: ModelType): Promise<void> {
    console.log(`[ModelService] Requesting model change to ${modelType}`);
    await this.modelManager.setModel(modelType);
  }

  /**
   * Gets the type of the currently configured AI model.
   */
  public getCurrentModel(): ModelType {
    return this.modelManager.getCurrentModel();
  }

  /**
   * Aborts any ongoing model request.
   */
  public abortRequest(): void {
    console.log('[ModelService] Requesting model abort.');
    this.modelManager.abortRequest();
  }

   /**
    * Gets the definitions for all registered prompts.
    */
   public getPromptDefinitions(): Partial<Record<PromptType, PromptDefinition<any>>> {
       // Return the central PROMPT_DEFINITIONS map
       return PROMPT_DEFINITIONS;
   }


  /**
   * Disposes of resources used by the ModelService.
   */
  dispose(): void {
    console.log('[ModelService] Disposing.');
    // Dispose the modelManager as it might have internal resources (like AbortController)
    if (this.modelManager) {
      this.modelManager.dispose();
    }
    // No other disposables managed directly by ModelService in this version
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}