// src/models/promptSystem.ts (renamed conceptually to promptUtils.ts later?)

import { inputAnalyzerPrompt, buildInputAnalyzerVariables, codeValidatorPrompt, buildCodeValidatorVariables, summarizerPrompt, buildSummarizerVariables, codeFragmenterPrompt, buildCodeFragmenterVariables, buildCodeAnalyzerVariables, codeAnalyzerPrompt, buildMemoryExtractorVariables, memoryExtractorPrompt, progressEvaluatorPrompt, buildProgressEvaluatorVariables } from './prompts';
import {
  explainCodePrompt,
  fixCodePrompt,
  conversationPrompt,
  buildConversationVariables,
  plannerPrompt,
  buildPlannerVariables
} from './prompts/index'; 

import { PromptType, BasePromptVariables, PromptVariables, PromptDefinition } from '../orchestrator/execution/types'; 


// Keep the definition mapping
export const PROMPT_DEFINITIONS: Partial<Record<PromptType, PromptDefinition<any>>> = {
  inputAnalyzer: { template: inputAnalyzerPrompt, buildVariables: buildInputAnalyzerVariables },
  codeValidator: { template: codeValidatorPrompt, buildVariables: buildCodeValidatorVariables },
  explainCodePrompt: { template: explainCodePrompt, buildVariables: mapContextToBaseVariables }, // Consider a dedicated builder later
  fixCodePrompt: { template: fixCodePrompt, buildVariables: mapContextToBaseVariables }, // Consider a dedicated builder later
  conversationResponder: { template: conversationPrompt, buildVariables: buildConversationVariables },
  planner: { template: plannerPrompt, buildVariables: buildPlannerVariables },
  summarizer: { template: summarizerPrompt, buildVariables: buildSummarizerVariables },
  codeFragmenter: { template: codeFragmenterPrompt, buildVariables: buildCodeFragmenterVariables },
  codeAnalyzer: { template: codeAnalyzerPrompt, buildVariables: buildCodeAnalyzerVariables },
  memoryExtractor: { template: memoryExtractorPrompt, buildVariables: buildMemoryExtractorVariables },
  progressEvaluator: { template: progressEvaluatorPrompt, buildVariables: buildProgressEvaluatorVariables },
};

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

export function fillPromptTemplate(template: string, variables: PromptVariables): string {
  let output = template;

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

   let finalOutput = dynamicOutput;
   for (const [key, value] of Object.entries(variables)) {
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

   finalOutput = finalOutput.replace(/\{\{.*?\}\}/g, '');

  return finalOutput;
}

export { buildInputAnalyzerVariables, buildCodeValidatorVariables, buildSummarizerVariables, buildCodeFragmenterVariables, buildCodeAnalyzerVariables, buildMemoryExtractorVariables, buildProgressEvaluatorVariables, buildConversationVariables, buildPlannerVariables };