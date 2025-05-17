// src/models/ModelService.ts

import * as vscode from 'vscode'; // Needed for Disposable
import { PromptDefinition, PromptType } from '../orchestrator';
import { IModelService } from '../models/interfaces';
import { ModelManager } from '../models/config/ModelManager';
import { fillPromptTemplate, PROMPT_DEFINITIONS } from '../models/promptSystem';
import { parseModelResponse } from '../models/config/modelUtils';
import { ModelType } from '../models/config/types';

function buildPromptVariablesHelper(type: PromptType, resolutionContextData: Record<string, any>): any { 
  const definition = PROMPT_DEFINITIONS[type];
  if (!definition) {
    throw new Error(`No prompt definition found for type: ${type}`);
  }

  return definition.buildVariables(resolutionContextData);
}

export class ModelService implements IModelService {
  private modelManager: ModelManager;
  private disposables: vscode.Disposable[] = []; 

  constructor(modelManager: ModelManager) {
    this.modelManager = modelManager;
    console.log('[ModelService] Initialized.');

   
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

    const definition = PROMPT_DEFINITIONS[type];
    if (!definition) {
      throw new Error(`Unknown prompt type: ${type}`);
    }

    try {
       
        const variables = buildPromptVariablesHelper(type, contextData);
       
        const filledPrompt = fillPromptTemplate(definition.template, variables);

    
        const rawResponse = await this.modelManager.sendPrompt(filledPrompt);

       
        return parseModelResponse<T>(type, rawResponse);

    } catch (error: any) {
        console.error(`[ModelService] Error during prompt execution for type ${type}:`, error);
      
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
       return PROMPT_DEFINITIONS; 
   }


  /**
   * Disposes of resources used by the ModelService.
   */
  dispose(): void {
    console.log('[ModelService] Disposing.');
    
    if (this.modelManager) {
      this.modelManager.dispose();
    
    }
    this.disposables.forEach(d => d.dispose());
    this.disposables = []; 
  }
}