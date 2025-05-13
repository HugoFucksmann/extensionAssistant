// src/models/promptSystem.ts

// Import PromptType and PromptVariables from types.ts
import { PromptDefinition, PromptType, PromptVariables, BasePromptVariables } from '../orchestrator'; // <-- Import PromptDefinition and BasePromptVariables

// Import prompt templates AND their builder functions
import {
  inputAnalyzerPrompt,
  buildInputAnalyzerVariables,
  codeValidatorPrompt,
  buildCodeValidatorVariables
} from './prompts';

import { ModelManager } from './config/ModelManager';
import { ModelType } from './config/types';
import { parseModelResponse } from './config/modelUtils';


// Map of prompt types to their templates AND builder functions
const PROMPT_DEFINITIONS: Partial<Record<PromptType, PromptDefinition<any>>> = { // Use PromptDefinition type
  inputAnalyzer: { template: inputAnalyzerPrompt, buildVariables: buildInputAnalyzerVariables },
  codeValidator: { template: codeValidatorPrompt, buildVariables: buildCodeValidatorVariables },
  
 
};



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
 * Helper function to map common context data keys to BasePromptVariables.
 * This centralizes the logic for extracting standard variables.
 * @param contextData Full resolution context data from InteractionContext
 * @returns An object conforming to BasePromptVariables
 */
export function mapContextToBaseVariables(contextData: Record<string, any>): BasePromptVariables {
     const baseVariables: BasePromptVariables = {
        userMessage: contextData.userMessage || '',
        chatHistory: contextData.chatHistoryString || '', // Assuming chatHistoryString is the key from context
        objective: contextData.objective,
        extractedEntities: contextData.extractedEntities,
        projectContext: contextData.projectInfo, // Assuming projectInfo is the key from context
        activeEditorContent: contextData.activeEditorContent, // Assuming activeEditorContent is the key from context
     };

     // Add dynamic keys like file content and search results using a safe approach
     const dynamicVariables = Object.keys(contextData)
        .filter(key => key.startsWith('fileContent:') || key.startsWith('searchResults:'))
        // Initialize accumulator with a type that allows string indexing
        .reduce((acc: Record<string, any>, key) => {
            acc[key] = contextData[key];
            return acc;
        }, {} as Record<string, any>); // Explicitly type the initial value

    // Combine base and dynamic variables
    return {
        ...baseVariables,
        ...dynamicVariables,
    };
}


/**
 * Builds variables for the prompt template based on the prompt type and context.
 * This function now delegates to the specific builder function registered for the prompt type.
 * @param type Prompt type
 * @param contextData Full resolution context data from InteractionContext
 * @returns Variables object for template substitution
 */
function buildPromptVariables(type: PromptType, contextData: Record<string, any>): PromptVariables {
    const definition = PROMPT_DEFINITIONS[type];
    if (!definition) {
        throw new Error(`No prompt definition found for type: ${type}`);
    }
    // Call the specific builder function for this prompt type, which uses the helper
    return definition.buildVariables(contextData);
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
    // Handle exact matches first
    const placeholder = `{{${key}}}`;
    const stringValue = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined
        ? String(value) // Use String() for primitives, handles null/undefined gracefully
        : JSON.stringify(value, null, 2); // Pretty print objects/arrays

    filledTemplate = filledTemplate.replace(
      new RegExp(placeholder, 'g'),
      stringValue.replace(/\$/g, '$$$$') // Escape '$' to prevent issues in replace
    );
  }

  // Handle dynamic keys like {{fileContent:.*}} or {{searchResults:.*}}
  // This requires iterating through the variables again to find keys matching the pattern
  // and replacing the pattern placeholder in the template.
  // NOTE: This is a simplified approach. A more robust templating engine might be better for complex cases.
  // For now, let's assume placeholders like {{fileContent:.*}} mean "include all variables starting with 'fileContent:'"
   const dynamicPlaceholderRegex = /\{\{(\w+):.\*\}}/g; // Matches {{prefix:.*}}
   let match;
   // Use a loop with exec to find all occurrences
   while ((match = dynamicPlaceholderRegex.exec(filledTemplate)) !== null) {
       const prefix = match[1]; // e.g., 'fileContent' or 'searchResults'
       const dynamicPlaceholder = match[0]; // e.g., '{{fileContent:.*}}'

       const relevantDynamicVariables = Object.entries(variables)
           .filter(([key]) => key.startsWith(`${prefix}:`));

       if (relevantDynamicVariables.length > 0) {
           const dynamicContent = relevantDynamicVariables
               .map(([key, value]) => {
                   // Format dynamic content - include the key/path/query
                   const contentString = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
                   const originalKey = key.substring(prefix.length + 1); // Remove prefix and colon
                   // Use markdown code blocks for code content
                   const codeBlockLang = prefix === 'fileContent' ? key.split('.').pop() : ''; // Guess language from file extension
                   return `### ${prefix.replace(/([A-Z])/g, ' $1').trim()}: ${originalKey}\n\n${codeBlockLang ? '```' + codeBlockLang + '\n' : ''}${contentString}${codeBlockLang ? '\n```' : ''}\n`;
               })
               .join('\n---\n'); // Separator between dynamic items

           // Replace the placeholder with the formatted dynamic content
           // Need to use the match index to replace correctly in the loop
           filledTemplate = filledTemplate.substring(0, match.index) +
                            dynamicContent +
                            filledTemplate.substring(match.index + dynamicPlaceholder.length);
           // Adjust the lastIndex for the next iteration because the string length changed
           dynamicPlaceholderRegex.lastIndex = match.index + dynamicContent.length;

       } else {
           // Remove the placeholder if no matching dynamic variables were found
            filledTemplate = filledTemplate.replace(new RegExp(dynamicPlaceholder, 'g'), '');
            // No need to adjust lastIndex if the placeholder is just removed (length decreases)
            // Reset lastIndex to continue search from the beginning of the modified string segment
            dynamicPlaceholderRegex.lastIndex = match.index; // Search again from where the placeholder was
       }
   }


  return filledTemplate;
}

/**
 * Main entry point for all model interactions
 * This function should be the only way to interact with the model from any part of the application
 *
 * @param type Prompt type to execute
 * @param context Full resolution context data from InteractionContext
 * @returns Parsed response according to prompt type
 */
export async function executeModelInteraction<T = any>(
  type: PromptType,
  context: Record<string, any> // This is the full resolution context from InteractionContext
): Promise<T> {
  if (!_modelManager) {
    throw new Error('PromptSystem not initialized. Call initializePromptSystem() first.');
  }

  // Get the prompt definition (template and builder)
  const definition = PROMPT_DEFINITIONS[type];
  if (!definition) {
    throw new Error(`Unknown prompt type: ${type}`);
  }

  // Build variables using the specific builder function and the full context
  const variables = buildPromptVariables(type, context);

  // Fill the template
  const filledPrompt = fillPromptTemplate(definition.template, variables);

  // Send to model and get raw response
  const rawResponse = await _modelManager.sendPrompt(filledPrompt);

  // Parse response based on prompt type using the refactored parseModelResponse
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