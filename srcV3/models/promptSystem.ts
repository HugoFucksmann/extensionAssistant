import {  PromptType, PromptVariables, BasePromptVariables } from '../orchestrator';
import { inputAnalyzerPrompt, buildInputAnalyzerVariables, codeValidatorPrompt, buildCodeValidatorVariables } from './prompts';
import { explainCodePrompt } from './prompts/intentions/prompt.explainCode';
import { fixCodePrompt } from './prompts/intentions/prompt.fixCode';
import { conversationPrompt } from './prompts/intentions/prompt.conversation';
import { buildConversationVariables } from './prompts/intentions/prompt.conversation';
import { ModelManager } from './config/ModelManager';
import { ModelType } from './config/types';
import { parseModelResponse } from './config/modelUtils';

// Import the FlowContext type
import { FlowContext } from '../orchestrator/context';

// Update PromptDefinition buildVariables type to accept FlowContext
interface PromptDefinition<T extends BasePromptVariables = BasePromptVariables> {
    template: string;
    // Build variables now receives the FlowContext (or the resolution context derived from it)
    // Let's keep it accepting Record<string, any> which is the output of FlowContext.getResolutionContext()
    // This allows us to keep buildVariables functions simpler for now.
    buildVariables: (resolutionContextData: Record<string, any>) => T;
}


// PROMPT_DEFINITIONS map remains largely the same, just ensuring correct buildVariables functions are used
const PROMPT_DEFINITIONS: Partial<Record<PromptType, PromptDefinition<any>>> = {
  inputAnalyzer: { template: inputAnalyzerPrompt, buildVariables: buildInputAnalyzerVariables },
  codeValidator: { template: codeValidatorPrompt, buildVariables: buildCodeValidatorVariables },
  explainCodePrompt: { template: explainCodePrompt, buildVariables: mapContextToBaseVariables }, // mapContextToBaseVariables will be updated
  fixCodePrompt: { template: fixCodePrompt, buildVariables: mapContextToBaseVariables }, // mapContextToBaseVariables will be updated
  conversationResponder: { template: conversationPrompt, buildVariables: buildConversationVariables } // buildConversationVariables will be updated
};

let _modelManager: ModelManager | null = null;

export function initializePromptSystem(modelManager: ModelManager): void {
  _modelManager = modelManager;
  console.log('[PromptSystem] Initialized successfully');
}

/**
 * Updated mapping function: Takes the flattened resolution context
 * and maps relevant keys to the BasePromptVariables structure.
 * FlowContext.getResolutionContext is responsible for gathering data from all layers.
 */
export function mapContextToBaseVariables(resolutionContextData: Record<string, any>): BasePromptVariables {
  const baseVariables: BasePromptVariables = {
    userMessage: resolutionContextData.userMessage || '',
    chatHistory: resolutionContextData.chatHistoryString || '', // From ConversationContext via FlowContext
    objective: resolutionContextData.analysisResult?.objective, // From FlowContext
    extractedEntities: resolutionContextData.analysisResult?.extractedEntities, // From FlowContext
    projectContext: resolutionContextData.projectInfo, // From GlobalContext via Session/Conv/Flow
    activeEditorContent: resolutionContextData.activeEditorContent // From SessionContext via Conv/Flow
  };

  // Add dynamic variables like file contents and search results from FlowContext state
  const dynamicVariables = Object.keys(resolutionContextData)
    .filter(key => key.startsWith('fileContent:') || key.startsWith('searchResults:'))
    .reduce<Record<string, any>>((acc, key) => {
      acc[key] = resolutionContextData[key];
      return acc;
    }, {});

  return { ...baseVariables, ...dynamicVariables };
}

// Update buildVariables functions in specific prompt files if they don't already
// use mapContextToBaseVariables or need custom logic accessing nested context.
// For now, mapContextToBaseVariables should suffice for BasePromptVariables.
// Example: buildInputAnalyzerVariables and buildConversationVariables might need minor tweaks
// if they access context data keys that are now nested or moved. Let's check those.

// No changes needed in buildInputAnalyzerVariables, as it already accesses keys expected in resolutionContextData
// function buildInputAnalyzerVariables(resolutionContextData: Record<string, any>): InputAnalyzerPromptVariables {
//     const baseVariables = mapContextToBaseVariables(resolutionContextData); // Uses updated mapContextToBaseVariables

//     const analyzerVariables: InputAnalyzerPromptVariables = {
//         ...baseVariables,
//         userPrompt: baseVariables.userMessage, // Gets from baseVariables
//         referencedFiles: resolutionContextData.referencedFiles || [] // Gets directly from resolutionContextData (from FlowContext state)
//     };
//     return analyzerVariables;
// }

// No changes needed in buildConversationVariables, as it already accesses keys expected in resolutionContextData
// function buildConversationVariables(resolutionContextData: Record<string, any>): ConversationPromptVariables {
//     const baseVariables = mapContextToBaseVariables(resolutionContextData); // Uses updated mapContextToBaseVariables

//     const conversationVariables: ConversationPromptVariables = {
//         ...baseVariables,
//         recentMessages: baseVariables.chatHistory, // Gets from baseVariables
//         summary: resolutionContextData.summary ? `Conversation Summary: ${resolutionContextData.summary}` // Gets from ConvContext via resolutionContextData
//                  : (baseVariables.projectContext ? `Project Context: ${JSON.stringify(baseVariables.projectContext, null, 2)}` : "No specific context available.")
//     };
//     return conversationVariables;
// }

// No changes needed in buildCodeValidatorVariables, as it uses mapContextToBaseVariables and accesses expected keys
// function buildCodeValidatorVariables(resolutionContextData: Record<string, any>): CodeValidatorPromptVariables {
//     const baseVariables = mapContextToBaseVariables(resolutionContextData); // Uses updated mapContextToBaseVariables

//     const validatorVariables: CodeValidatorPromptVariables = {
//         ...baseVariables,
//         proposedChanges: resolutionContextData.proposedChanges || [], // Gets from FlowContext state via resolutionContextData
//         originalCode: resolutionContextData.activeEditorContent // Gets from SessionContext via resolutionContextData
//     };
//     return validatorVariables;
// }


function buildPromptVariables(type: PromptType, resolutionContextData: Record<string, any>): PromptVariables {
  const definition = PROMPT_DEFINITIONS[type];
  if (!definition) {
    throw new Error(`No prompt definition found for type: ${type}`);
  }
  // Pass the resolution context data to the specific buildVariables function
  return definition.buildVariables(resolutionContextData);
}

function fillPromptTemplate(template: string, variables: PromptVariables): string {
  let filledTemplate = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    // Ensure value is converted to string safely for substitution
    const stringValue = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined
      ? String(value)
      : JSON.stringify(value, null, 2); // Safely stringify objects/arrays

    // Replace all occurrences, escape $ for replace
    filledTemplate = filledTemplate.replace(
      new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), // Escape regex special chars
      stringValue.replace(/\$/g, '$$$$') // Escape $ for replace
    );
  }

  // Handle dynamic placeholders like {{prefix:.*}}
  // This logic seems specific to fileContent and searchResults based on the original implementation.
  // It iterates through variables and finds keys starting with the prefix, then formats them.
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
                  const contentString = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
                  const originalKey = key.substring(prefix.length + 1); // Get the part after the prefix
                  // Try to infer language for code block based on originalKey (filepath)
                  const codeBlockLang = prefix === 'fileContent' ? originalKey.split('.').pop() : '';

                  return `### ${prefix.replace(/([A-Z])/g, ' $1').trim()} for ${originalKey}:\n\n${codeBlockLang ? '```' + codeBlockLang + '\n' : ''}${contentString}${codeBlockLang ? '\n```' : ''}\n`;
              })
              .join('\n---\n'); // Separator between dynamic content blocks

          output += dynamicContent;
          // Adjust lastIndex based on how much we added, though regex lastIndex is based on template match
          // A more robust way would be to build the string piece by piece as done here.
      } else {
          // If no dynamic variables found for the placeholder, output nothing or a marker
          // output += `[No ${prefix} found]`; // Or just nothing
      }
  }
  output += template.substring(lastIndex); // Add remaining part of the template

  // Now, replace static placeholders {{key}} in the output
   let finalOutput = output;
   for (const [key, value] of Object.entries(variables)) {
       // Skip dynamic keys that were handled above
       if (key.includes(':')) continue;

       const placeholder = `{{${key}}}`;
       const stringValue = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined
         ? String(value)
         : JSON.stringify(value, null, 2);

       finalOutput = finalOutput.replace(
         new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
         stringValue.replace(/\$/g, '$$$$')
       );
   }


   // Remove any remaining unresolved static placeholders if any, though buildVariables should provide all required
   finalOutput = finalOutput.replace(/\{\{.*?\}\}/g, '');


  return finalOutput;
}


export async function executeModelInteraction<T = any>(
  type: PromptType,
  // Now accepts the resolution context data generated by FlowContext
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
  const rawResponse = await _modelManager.sendPrompt(filledPrompt);
  return parseModelResponse<T>(type, rawResponse);
}

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