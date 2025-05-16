import { PromptType, BasePromptVariables,  PromptVariables } from '../orchestrator';
import { inputAnalyzerPrompt, buildInputAnalyzerVariables, codeValidatorPrompt, buildCodeValidatorVariables, summarizerPrompt, buildSummarizerVariables, codeFragmenterPrompt, buildCodeFragmenterVariables, buildCodeAnalyzerVariables, codeAnalyzerPrompt, buildMemoryExtractorVariables, memoryExtractorPrompt, progressEvaluatorPrompt, buildProgressEvaluatorVariables } from './prompts';
import {
  explainCodePrompt,
  fixCodePrompt,
  conversationPrompt,
  buildConversationVariables,
  plannerPrompt,
  buildPlannerVariables
} from './prompts/index'; // Importar desde el índice centralizado

import { ModelManager } from './config/ModelManager'; // Assuming this exists
import { ModelType } from './config/types'; // Assuming this exists
import { parseModelResponse } from './config/modelUtils'; // Assuming this exists

interface PromptDefinition<T extends BasePromptVariables = BasePromptVariables> {
  template: string;
  buildVariables: (resolutionContextData: Record<string, any>) => T;
}

const PROMPT_DEFINITIONS: Partial<Record<PromptType, PromptDefinition<any>>> = {
  inputAnalyzer: { template: inputAnalyzerPrompt, buildVariables: buildInputAnalyzerVariables },
  codeValidator: { template: codeValidatorPrompt, buildVariables: buildCodeValidatorVariables },
  explainCodePrompt: { template: explainCodePrompt, buildVariables: mapContextToBaseVariables }, // Consider a dedicated builder later
  fixCodePrompt: { template: fixCodePrompt, buildVariables: mapContextToBaseVariables }, // Consider a dedicated builder later
  conversationResponder: { template: conversationPrompt, buildVariables: buildConversationVariables },
  planner: { template: plannerPrompt, buildVariables: buildPlannerVariables },
  summarizer: { template: summarizerPrompt, buildVariables: buildSummarizerVariables }, // <-- Add the new definition
  codeFragmenter: { template: codeFragmenterPrompt, buildVariables: buildCodeFragmenterVariables },
  codeAnalyzer: { template: codeAnalyzerPrompt, buildVariables: buildCodeAnalyzerVariables },
  memoryExtractor: { template: memoryExtractorPrompt, buildVariables: buildMemoryExtractorVariables },
  progressEvaluator: { template: progressEvaluatorPrompt, buildVariables: buildProgressEvaluatorVariables },
};

let _modelManager: ModelManager | null = null;

export function initializePromptSystem(modelManager: ModelManager): void {
  _modelManager = modelManager;
  // console.log('[PromptSystem] Initialized'); // Reduced logging
}

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
    .filter(key => !(key in baseVariables) && key !== 'chatHistoryString' && key !== 'planningHistory' && key !== 'planningIteration' && key !== 'analysisResult')
    .reduce<Record<string, any>>((acc, key) => {
      acc[key] = resolutionContextData[key];
      return acc;
    }, {});

  return { ...baseVariables, ...dynamicVariables };
}

function buildPromptVariables(type: PromptType, resolutionContextData: Record<string, any>): PromptVariables {
  const definition = PROMPT_DEFINITIONS[type];
  if (!definition) {
    throw new Error(`No prompt definition found for type: ${type}`);
  }
  // Pass the full resolutionContextData to the builder
  return definition.buildVariables(resolutionContextData);
}

export function getPromptDefinitions(): Partial<Record<PromptType, PromptDefinition<any>>> {
  return PROMPT_DEFINITIONS;
}

function fillPromptTemplate(template: string, variables: PromptVariables): string {
  let output = template;

  // Handle dynamic placeholders like {{prefix:.*}} first
  const dynamicPlaceholderRegex = /\{\{(\w+):.\*\}}/g;
  let match;
  let lastIndex = 0;
  let dynamicOutput = '';

  while ((match = dynamicPlaceholderRegex.exec(template)) !== null) {
      dynamicOutput += template.substring(lastIndex, match.index);
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

          dynamicOutput += dynamicContent;
      }
  }
  dynamicOutput += template.substring(lastIndex);


  // Handle static placeholders {{key}} in the generated output string
   let finalOutput = dynamicOutput;
   for (const [key, value] of Object.entries(variables)) {
       if (key.includes(':')) continue; // Skip keys handled by dynamic placeholders

       const placeholder = `{{${key}}}`;
       const stringValue = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined
         ? String(value)
         : JSON.stringify(value, null, 2);

       finalOutput = finalOutput.replace(
         new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
         stringValue.replace(/\$/g, '$$$$') // Escape $ for replace
       );
   }

   // Remove any remaining unresolved static placeholders
   finalOutput = finalOutput.replace(/\{\{.*?\}\}/g, '');

  return finalOutput;
}

export async function executeModelInteraction<T = any>(
  type: PromptType,
  resolutionContextData: Record<string, any>
): Promise<T> {
  if (!_modelManager) {
    throw new Error('PromptSystem not initialized. Call initializePromptSystem() first.');
  }

  const definition = PROMPT_DEFINITIONS[type];
  if (!definition) {
    throw new Error(`Unknown prompt type: ${type}`);
  }

  const variables = buildPromptVariables(type, resolutionContextData);
  const filledPrompt = fillPromptTemplate(definition.template, variables);

  const rawResponse = await _modelManager.sendPrompt(filledPrompt);
  return parseModelResponse<T>(type, rawResponse);
}

export async function changeModel(modelType: ModelType): Promise<void> {
  if (!_modelManager) throw new Error('PromptSystem not initialized.');
  await _modelManager.setModel(modelType);
}

export function getCurrentModel(): ModelType {
  if (!_modelManager) throw new Error('PromptSystem not initialized.');
  return _modelManager.getCurrentModel();
}

export function abortModelRequest(): void {
  if (_modelManager) {
    _modelManager.abortRequest();
  }
}

export function disposePromptSystem(): void {
  if (_modelManager) {
      _modelManager.dispose();
      _modelManager = null;
  }
}