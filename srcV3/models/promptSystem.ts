import { PromptDefinition, PromptType, PromptVariables, BasePromptVariables, PlannerResponse } from '../orchestrator'; // Import PlannerResponse
import { inputAnalyzerPrompt, buildInputAnalyzerVariables, codeValidatorPrompt, buildCodeValidatorVariables } from './prompts';
import { explainCodePrompt } from './prompts/intentions/prompt.explainCode';
import { fixCodePrompt } from './prompts/intentions/prompt.fixCode';
import { conversationPrompt } from './prompts/intentions/prompt.conversation';
import { buildConversationVariables } from './prompts/intentions/prompt.conversation';
// Import the new planner prompt definition and builder
import { plannerPrompt, buildPlannerVariables } from './prompts/intentions/prompt.planner';

import { ModelManager } from './config/ModelManager';
import { ModelType } from './config/types';
import { parseModelResponse } from './config/modelUtils';

// Need access to ToolRunner to list tools for the planner prompt variables



// Update PROMPT_DEFINITIONS to include the new planner prompt
const PROMPT_DEFINITIONS: Partial<Record<PromptType, PromptDefinition<any>>> = {
  inputAnalyzer: { template: inputAnalyzerPrompt, buildVariables: buildInputAnalyzerVariables },
  codeValidator: { template: codeValidatorPrompt, buildVariables: buildCodeValidatorVariables },
  explainCodePrompt: { template: explainCodePrompt, buildVariables: mapContextToBaseVariables },
  fixCodePrompt: { template: fixCodePrompt, buildVariables: mapContextToBaseVariables },
  conversationResponder: { template: conversationPrompt, buildVariables: buildConversationVariables },
  planner: { template: plannerPrompt, buildVariables: buildPlannerVariables } // Register the planner prompt
};

let _modelManager: ModelManager | null = null;

export function initializePromptSystem(modelManager: ModelManager): void {
  _modelManager = modelManager;
  console.log('[PromptSystem] Initialized successfully');
}

// mapContextToBaseVariables remains the same, it maps flattened context to BasePromptVariables
export function mapContextToBaseVariables(resolutionContextData: Record<string, any>): BasePromptVariables {
  const baseVariables: BasePromptVariables = {
    userMessage: resolutionContextData.userMessage || '',
    chatHistory: resolutionContextData.chatHistoryString || '',
    objective: resolutionContextData.analysisResult?.objective,
    extractedEntities: resolutionContextData.analysisResult?.extractedEntities,
    projectContext: resolutionContextData.projectInfo,
    activeEditorContent: resolutionContextData.activeEditorContent
  };

  const dynamicVariables = Object.keys(resolutionContextData)
    .filter(key => key.startsWith('fileContent:') || key.startsWith('searchResults:') || key.startsWith('toolResult:') || key.startsWith('promptResult:')) // Add potential prefixes for step results
    .reduce<Record<string, any>>((acc, key) => {
      acc[key] = resolutionContextData[key];
      return acc;
    }, {});

  return { ...baseVariables, ...dynamicVariables };
}

// Update buildPromptVariables to handle the new planner variables builder
function buildPromptVariables(type: PromptType, resolutionContextData: Record<string, any>): PromptVariables {
  const definition = PROMPT_DEFINITIONS[type];
  if (!definition) {
    throw new Error(`No prompt definition found for type: ${type}`);
  }

  // If the prompt type is 'planner', the buildVariables function needs access to ToolRunner and PROMPT_DEFINITIONS
  // We can pass them here, or modify buildPlannerVariables to import them directly.
  // Let's modify buildPlannerVariables to import ToolRunner and access PROMPT_DEFINITIONS via closure/export.
  // The current implementation of buildPlannerVariables imports ToolRunner and assumes PROMPT_DEFINITIONS is available in its scope.
  // To make PROMPT_DEFINITIONS available, we can export it or pass it. Passing is cleaner.
  // Let's update buildPlannerVariables signature and call site.

  // Refactored buildPromptVariables to pass necessary dependencies to specific builders if needed
   if (type === 'planner') {
       // buildPlannerVariables needs ToolRunner and PROMPT_DEFINITIONS
       // We can pass them explicitly, or modify buildPlannerVariables to import ToolRunner
       // and access PROMPT_DEFINITIONS via an exported getter or similar.
       // Let's modify buildPlannerVariables to import ToolRunner and use a getter for PROMPT_DEFINITIONS.
       // This keeps the signature consistent.
       return definition.buildVariables(resolutionContextData); // buildPlannerVariables will handle its dependencies
   } else {
       // Other builders just need the resolution context data
       return definition.buildVariables(resolutionContextData);
   }
}

// Add a getter for PROMPT_DEFINITIONS so buildPlannerVariables can access it
export function getPromptDefinitions(): Partial<Record<PromptType, PromptDefinition<any>>> {
    return PROMPT_DEFINITIONS;
}


function fillPromptTemplate(template: string, variables: PromptVariables): string {
  // This function remains largely the same, it takes the template and the built variables
  // and performs the substitution. The logic for dynamic placeholders {{prefix:.*}}
  // and static placeholders {{key}} should handle the structure of `variables`
  // which is derived from the resolution context.

  let filledTemplate = template;

  // First, handle dynamic placeholders like {{prefix:.*}}
  // This logic iterates through the *template* to find dynamic placeholders
  // and then looks for corresponding keys in the *variables* object.
  const dynamicPlaceholderRegex = /\{\{(\w+):.\*\}}/g;
  let match;
  let lastIndex = 0;
  let output = '';

  while ((match = dynamicPlaceholderRegex.exec(template)) !== null) {
      output += template.substring(lastIndex, match.index);
      lastIndex = dynamicPlaceholderRegex.lastIndex;

      const prefix = match[1];
      // Find variables in the built 'variables' object that match the prefix
      const relevantDynamicVariables = Object.entries(variables)
          .filter(([key]) => key.startsWith(`${prefix}:`));

      if (relevantDynamicVariables.length > 0) {
          const dynamicContent = relevantDynamicVariables
              .map(([key, value]) => {
                  // Safely stringify complex values
                  const contentString = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined
                    ? String(value)
                    : JSON.stringify(value, null, 2);

                  const originalKey = key.substring(prefix.length + 1); // Get the part after the prefix
                  // Try to infer language for code block based on originalKey (filepath)
                  const codeBlockLang = prefix === 'fileContent' ? originalKey.split('.').pop() : '';

                  // Format the dynamic content block
                  return `### ${prefix.replace(/([A-Z])/g, ' $1').trim()} for ${originalKey}:\n\n${codeBlockLang ? '```' + codeBlockLang + '\n' : ''}${contentString}${codeBlockLang ? '\n```' : ''}\n`;
              })
              .join('\n---\n'); // Separator between dynamic content blocks

          output += dynamicContent;
          // No need to adjust lastIndex based on added content length here,
          // as we are building a new string 'output' and lastIndex tracks
          // position in the original 'template'.
      } else {
          // If no dynamic variables found for the placeholder, output nothing or a marker
          // output += `[No ${prefix} found]`; // Or just nothing
      }
  }
  output += template.substring(lastIndex); // Add remaining part of the template


  // Second, handle static placeholders {{key}} in the generated output string
   let finalOutput = output;
   for (const [key, value] of Object.entries(variables)) {
       // Skip keys that were already handled by dynamic placeholders (they start with a prefix and ':')
       if (key.includes(':')) continue;

       const placeholder = `{{${key}}}`;
       // Safely stringify complex values
       const stringValue = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined
         ? String(value)
         : JSON.stringify(value, null, 2);

       // Replace all occurrences, escape regex special chars and $ for replace
       finalOutput = finalOutput.replace(
         new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
         stringValue.replace(/\$/g, '$$$$')
       );
   }


   // Optional: Remove any remaining unresolved static placeholders if any, though buildVariables should provide all required
   // finalOutput = finalOutput.replace(/\{\{.*?\}\}/g, '');


  return finalOutput;
}


export async function executeModelInteraction<T = any>(
  type: PromptType,
  // Accepts the resolution context data generated by FlowContext
  resolutionContextData: Record<string, any>
): Promise<T> {
  if (!_modelManager) {
    throw new Error('PromptSystem not initialized. Call initializePromptSystem() first.');
  }

  const definition = PROMPT_DEFINITIONS[type];
  if (!definition) {
    throw new Error(`Unknown prompt type: ${type}`);
  }

  // Build variables using the provided resolution context data
  const variables = buildPromptVariables(type, resolutionContextData);
  const filledPrompt = fillPromptTemplate(definition.template, variables);

  // Use parseModelResponse to handle JSON extraction based on prompt type
  const rawResponse = await _modelManager.sendPrompt(filledPrompt);
  return parseModelResponse<T>(type, rawResponse);
}

// ... (changeModel, getCurrentModel, abortModelRequest, disposePromptSystem remain the same)

export async function changeModel(modelType: ModelType): Promise<void> {
  if (!_modelManager) {
    throw new Error('PromptSystem not initialized. Call initializePromptSystem() first.');
  }
  await _modelManager.setModel(modelType);
}

export function getCurrentModel(): ModelType {
  if (!_modelManager) {
    throw new Error('PromptSystem not initialized. Call initializePromptSystem() first.');
  }
  return _modelManager.getCurrentModel();
}

export function abortModelRequest(): void {
  if (_modelManager) {
    _modelManager.abortRequest();
  }
}

export function disposePromptSystem(): void {
  // ModelManager dispose handles aborting requests internally
  if (_modelManager) {
      _modelManager.dispose();
      _modelManager = null;
  }
}