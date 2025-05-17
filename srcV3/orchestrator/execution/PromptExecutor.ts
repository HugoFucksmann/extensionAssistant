// src/orchestrator/execution/PromptExecutor.ts
import { IModelService } from '../../models/interfaces';
import { IExecutor, PromptType, PromptDefinition } from "./types"; 

/**
 * PromptExecutor implements the IExecutor interface for AI prompt-based actions.
 * It delegates to the injected IModelService for model interactions.
 */
export class PromptExecutor implements IExecutor {
  private readonly modelService: IModelService; 
  private readonly promptDefinitions: Partial<Record<PromptType, PromptDefinition<any>>>; 


  constructor(modelService: IModelService) { 
    this.modelService = modelService;
   
    this.promptDefinitions = this.modelService.getPromptDefinitions();
    console.log('[PromptExecutor] Initialized.');
  }

  /**
   * Checks if this executor can handle the specified prompt action.
   * It checks if the action string corresponds to a registered prompt type via the ModelService.
   * @param action The prompt type string to check
   * @returns true if the prompt type is recognized by the ModelService
   */
  canExecute(action: string): boolean {
   
    const isRecognized = this.promptDefinitions.hasOwnProperty(action);
   
    return isRecognized;
  }

  /**
   * Executes the specified prompt with the provided parameters.
   * For PromptExecutor, the 'params' parameter is the full resolution context data.
   * It uses the injected IModelService to execute the prompt.
   * @param action The prompt type string to execute (must be a valid PromptType)
   * @param fullContextData The full resolution context data from FlowContext
   * @returns Promise resolving to the result of the model interaction
   */
  async execute(action: string, fullContextData: Record<string, any>): Promise<any> {
  
    return this.modelService.executePrompt(action as PromptType, fullContextData);
  }


}