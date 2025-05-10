

// Types for prompt system
export type PromptType = 
  | 'inputAnalyzer'
  | 'planningEngine'
  | 'editing'
  | 'examination'
  | 'projectManagement'
  | 'projectSearch'
  | 'resultEvaluator'

// Type for variables that can be passed to prompts
export type PromptVariables = Record<string, any>;

// Import prompt templates
import { inputAnalyzerPrompt } from './prompts/prompt.inputAnalyzer';
import { planningEnginePrompt } from './prompts/prompt.planningEngine';
import { editingPrompt } from './prompts/prompt.editing';
import { examinationPrompt } from './prompts/prompt.examination';
import { projectManagementPrompt } from './prompts/prompt.projectManagement';
import { projectSearchPrompt } from './prompts/prompt.projectSearch';
import { resultEvaluatorPrompt } from './prompts/prompt.resultEvaluator';

import { ModelManager } from './config/ModelManager';
import { ModelType } from './config/types';
import { parseModelResponse } from './config/modelUtils';

// Map of prompt types to their templates
const PROMPT_MAP: Record<PromptType, string> = {
  inputAnalyzer: inputAnalyzerPrompt,
  planningEngine: planningEnginePrompt,
  editing: editingPrompt,
  examination: examinationPrompt,
  projectManagement: projectManagementPrompt,
  projectSearch: projectSearchPrompt,
  resultEvaluator: resultEvaluatorPrompt,
};

// Instancia del ModelManager
let _modelManager: ModelManager | null = null;

/**
 * Initializes the prompt system
 * @param modelManager ModelManager instance
 */
export function initializePromptSystem(modelManager: ModelManager): void {
  _modelManager = modelManager;
  console.log('[PromptSystem] Initialized successfully');
}

/**
 * Builds variables for the prompt template based on the prompt type and context
 * @param type Prompt type
 * @param context Context data
 * @returns Variables object for template substitution
 */
function buildPromptVariables(type: PromptType, context: Record<string, any>): PromptVariables {
  // Processing específico para cada tipo de prompt
  switch (type) {
    case 'projectManagement':
      return {
        projectInfo: context.projectInfo || {},
        action: context.action || "analyze",
        // Add more context variables as needed
      };
    
    // Add more cases for other prompt types
    
    default:
      // For simple cases, just pass the context as is
      return context;
  }
}

/**
 * Fills a prompt template with variables
 * @param template Prompt template with {{variable}} placeholders
 * @param variables Object with variable values
 * @returns Filled template string
 */
function fillPromptTemplate(template: string, variables: PromptVariables): string {
  let filledTemplate = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    filledTemplate = filledTemplate.replace(
      new RegExp(placeholder, 'g'),
      typeof value === 'string' ? value : JSON.stringify(value)
    );
  }
  return filledTemplate;
}

/**
 * Main entry point for all model interactions
 * This function should be the only way to interact with the model from any part of the application
 * 
 * @param type Prompt type to execute
 * @param context Context with variables for the prompt
 * @returns Parsed response according to prompt type
 */
export async function executeModelInteraction<T = any>(
  type: PromptType,
  context: Record<string, any>
): Promise<T> {
  if (!_modelManager) {
    throw new Error('PromptSystem not initialized. Call initializePromptSystem() first.');
  }
  
  // Get the prompt template
  const template = PROMPT_MAP[type];
  if (!template) {
    throw new Error(`Unknown prompt type: ${type}`);
  }
  
  // Build variables and fill the template
  const variables = buildPromptVariables(type, context);
  const filledPrompt = fillPromptTemplate(template, variables);
  
  // Send to model and get raw response
  const rawResponse = await _modelManager.sendPrompt(filledPrompt);
  
  // Parse response based on prompt type
  return parseModelResponse<T>(type, rawResponse);
}

/**
 * Changes the current model
 * @param modelType New model type to use
 */
export async function changeModel(modelType: ModelType): Promise<void> {
  if (!_modelManager) {
    throw new Error('PromptSystem not initialized. Call initializePromptSystem() first.');
  }
  
  await _modelManager.setModel(modelType);
}

/**
 * Gets the current model type
 */
export function getCurrentModel(): ModelType {
  if (!_modelManager) {
    throw new Error('PromptSystem not initialized. Call initializePromptSystem() first.');
  }
  
  return _modelManager.getCurrentModel();
}

/**
 * Aborts any ongoing model request
 */
export function abortModelRequest(): void {
  if (_modelManager) {
    _modelManager.abortRequest();
  }
}

/**
 * Releases resources used by the prompt system
 */
export function disposePromptSystem(): void {
  _modelManager = null;
}