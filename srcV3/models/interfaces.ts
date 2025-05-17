// src/models/interfaces.ts

import * as vscode from 'vscode';
import { PromptType } from '../orchestrator/execution/types'; // Ensure correct import path for PromptType

import { PromptDefinition } from '../orchestrator/execution/types'; // Assuming PromptDefinition will be used elsewhere or moved here
import { ModelType } from './config/types';

// Define the PromptDefinition interface here if it's needed externally
// Or keep it internal to the models module if only ModelService needs it

// If PromptDefinition is internal to the models module:
// interface PromptDefinition<T extends BasePromptVariables = BasePromptVariables> {
//   template: string;
//   buildVariables: (resolutionContextData: Record<string, any>) => T;
// }


/**
 * Interface for the service managing AI model interactions and prompt execution.
 * This is the main entry point for other parts of the extension to interact with the models module.
 */
export interface IModelService extends vscode.Disposable {
    /**
     * Executes a specific prompt type using the configured model.
     * Handles variable building, template filling, model request, and response parsing.
     * @param type The type of prompt to execute.
     * @param contextData The data needed to build the prompt variables.
     * @returns A promise resolving with the parsed model response.
     * @throws Error if the prompt type is unknown, variables cannot be built, or the model request fails.
     */
    executePrompt<T = any>(
      type: PromptType,
      contextData: Record<string, any>
    ): Promise<T>;

    /**
     * Changes the currently configured AI model.
     * @param modelType The type of model to switch to ('ollama' or 'gemini').
     * @returns A promise that resolves when the model is successfully changed.
     * @throws Error if the model type is unsupported or changing fails.
     */
    changeModel(modelType: ModelType): Promise<void>;

    /**
     * Gets the type of the currently configured AI model.
     * @returns The current model type.
     */
    getCurrentModel(): ModelType;

    /**
     * Aborts any ongoing model request.
     */
    abortRequest(): void;

    /**
     * Gets the definitions for all registered prompts.
     * Useful for components needing to understand available prompts or their variable requirements.
     * @returns A partial record of prompt definitions by type.
     */
    getPromptDefinitions(): Partial<Record<PromptType, PromptDefinition<any>>>; // Add this if AgentOrchestratorService needs it
}