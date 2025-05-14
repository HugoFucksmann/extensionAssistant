import {  PromptType, PromptVariables, BasePromptVariables, PlannerResponse } from '../orchestrator'; // Import PlannerResponse
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
// This import is now handled within buildPlannerVariables itself
// import { ToolRunner } from '../services/toolRunner';


// Update PromptDefinition buildVariables type to accept resolution context data
interface PromptDefinition<T extends BasePromptVariables = BasePromptVariables> {
    template: string;
    buildVariables: (resolutionContextData: Record<string, any>) => T;
}


// PROMPT_DEFINITIONS map remains largely the same, just ensuring correct buildVariables functions are used
const PROMPT_DEFINITIONS: Partial<Record<PromptType, PromptDefinition<any>>> = {
  inputAnalyzer: { template: inputAnalyzerPrompt, buildVariables: buildInputAnalyzerVariables },
  codeValidator: { template: codeValidatorPrompt, buildVariables: buildCodeValidatorVariables },
  explainCodePrompt: { template: explainCodePrompt, buildVariables: mapContextToBaseVariables }, // mapContextToBaseVariables will be updated
  fixCodePrompt: { template: fixCodePrompt, buildVariables: mapContextToBaseVariables }, // mapContextToBaseVariables will be updated
  conversationResponder: { template: conversationPrompt, buildVariables: buildConversationVariables }, // buildConversationVariables will be updated
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
    chatHistory: resolutionContextData.chatHistoryString || '', // From ConversationContext via FlowContext
    objective: resolutionContextData.analysisResult?.objective, // From FlowContext
    extractedEntities: resolutionContextData.analysisResult?.extractedEntities, // From FlowContext
    projectContext: resolutionContextData.projectInfo, // From GlobalContext via Session/Conv/Flow
    activeEditorContent: resolutionContextData.activeEditorContent // From SessionContext via Conv/Flow
  };

  // Add dynamic variables like file contents and search results from FlowContext state
  // Include any key that is not one of the standard base variables
  const dynamicVariables = Object.keys(resolutionContextData)
    .filter(key => !(key in baseVariables) && key !== 'chatHistoryString' && key !== 'planningHistory' && key !== 'planningIteration' && key !== 'analysisResult') // Exclude standard base keys and planning keys
    .reduce<Record<string, any>>((acc, key) => {
      acc[key] = resolutionContextData[key];
      return acc;
    }, {});

  return { ...baseVariables, ...dynamicVariables };
}


// buildPromptVariables remains the same, it passes resolutionContextData to the specific builder
function buildPromptVariables(type: PromptType, resolutionContextData: Record<string, any>): PromptVariables {
  const definition = PROMPT_DEFINITIONS[type];
  if (!definition) {
    throw new Error(`No prompt definition found for type: ${type}`);
  }
  // Pass the resolution context data to the specific buildVariables function
  return definition.buildVariables(resolutionContextData);
}

// Add a getter for PROMPT_DEFINITIONS so buildPlannerVariables can access it
export function getPromptDefinitions(): Partial<Record<PromptType, PromptDefinition<any>>> {
    return PROMPT_DEFINITIONS;
}


// fillPromptTemplate remains the same, it substitutes placeholders using the built variables
function fillPromptTemplate(template: string, variables: PromptVariables): string {
  let filledTemplate = template;

  // First, handle dynamic placeholders like {{prefix:.*}}
  const dynamicPlaceholderRegex = /\{\{(\w+):.\*\}}/g;
  let match;
  let lastIndex = 0;
  let output = '';

  while ((match = dynamicPlaceholderRegex.exec(template)) !== null) {
      output += template.substring(lastIndex, match.index);
      lastIndex = dynamicPlaceholderRegex.lastIndex;

      const prefix = match[1];
      const relevantDynamicVariables = Object.entries(variables)
          .filter(([key]) => key.startsWith(`${prefix}:`));

      if (relevantDynamicVariables.length > 0) {
          const dynamicContent = relevantDynamicVariables
              .map(([key, value]) => {
                  const contentString = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined
                    ? String(value)
                    : JSON.stringify(value, null, 2);

                  const originalKey = key.substring(prefix.length + 1);
                  const codeBlockLang = prefix === 'fileContent' ? originalKey.split('.').pop() : '';

                  return `### ${prefix.replace(/([A-Z])/g, ' $1').trim()} for ${originalKey}:\n\n${codeBlockLang ? '```' + codeBlockLang + '\n' : ''}${contentString}${codeBlockLang ? '\n```' : ''}\n`;
              })
              .join('\n---\n');

          output += dynamicContent;
      } else {
          // If no dynamic variables found, remove the placeholder
          // output += `[No ${prefix} found]`; // Or just nothing
      }
  }
  output += template.substring(lastIndex);


  // Second, handle static placeholders {{key}} in the generated output string
   let finalOutput = output;
   for (const [key, value] of Object.entries(variables)) {
       // Skip keys that were already handled by dynamic placeholders (they start with a prefix and ':')
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

   // Remove any remaining unresolved static placeholders if any
   finalOutput = finalOutput.replace(/\{\{.*?\}\}/g, '');


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