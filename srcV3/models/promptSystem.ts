import { PromptDefinition, PromptType, PromptVariables, BasePromptVariables } from '../orchestrator';
import { inputAnalyzerPrompt, buildInputAnalyzerVariables, codeValidatorPrompt, buildCodeValidatorVariables } from './prompts';
import { explainCodePrompt } from './prompts/intentions/prompt.explainCode';
import { fixCodePrompt } from './prompts/intentions/prompt.fixCode';
import { ModelManager } from './config/ModelManager';
import { ModelType } from './config/types';
import { parseModelResponse } from './config/modelUtils';

const PROMPT_DEFINITIONS: Partial<Record<PromptType, PromptDefinition<any>>> = {
  inputAnalyzer: { template: inputAnalyzerPrompt, buildVariables: buildInputAnalyzerVariables },
  codeValidator: { template: codeValidatorPrompt, buildVariables: buildCodeValidatorVariables },
  explainCodePrompt: { template: explainCodePrompt, buildVariables: mapContextToBaseVariables },
  fixCodePrompt: { template: fixCodePrompt, buildVariables: mapContextToBaseVariables }
};

let _modelManager: ModelManager | null = null;

export function initializePromptSystem(modelManager: ModelManager): void {
  _modelManager = modelManager;
  console.log('[PromptSystem] Initialized successfully');
}

export function mapContextToBaseVariables(contextData: Record<string, any>): BasePromptVariables {
  const baseVariables: BasePromptVariables = {
    userMessage: contextData.userMessage || '',
    chatHistory: contextData.chatHistoryString || '',
    objective: contextData.objective,
    extractedEntities: contextData.extractedEntities,
    projectContext: contextData.projectInfo,
    activeEditorContent: contextData.activeEditorContent
  };

  const dynamicVariables = Object.keys(contextData)
    .filter(key => key.startsWith('fileContent:') || key.startsWith('searchResults:'))
    .reduce<Record<string, any>>((acc, key) => {
      acc[key] = contextData[key];
      return acc;
    }, {});

  return { ...baseVariables, ...dynamicVariables };
}

function buildPromptVariables(type: PromptType, contextData: Record<string, any>): PromptVariables {
  const definition = PROMPT_DEFINITIONS[type];
  if (!definition) {
    throw new Error(`No prompt definition found for type: ${type}`);
  }
  return definition.buildVariables(contextData);
}

function fillPromptTemplate(template: string, variables: PromptVariables): string {
  let filledTemplate = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    const stringValue = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined
      ? String(value)
      : JSON.stringify(value, null, 2);

    filledTemplate = filledTemplate.replace(
      new RegExp(placeholder, 'g'),
      stringValue.replace(/\$/g, '$$$$')
    );
  }

  const dynamicPlaceholderRegex = /\{\{(\w+):.\*\}}/g;
  let match;
  while ((match = dynamicPlaceholderRegex.exec(filledTemplate)) !== null) {
    const prefix = match[1];
    const dynamicPlaceholder = match[0];

    const relevantDynamicVariables = Object.entries(variables)
      .filter(([key]) => key.startsWith(`${prefix}:`));

    if (relevantDynamicVariables.length > 0) {
      const dynamicContent = relevantDynamicVariables
        .map(([key, value]) => {
          const contentString = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
          const originalKey = key.substring(prefix.length + 1);
          const codeBlockLang = prefix === 'fileContent' ? key.split('.').pop() : '';
          return `### ${prefix.replace(/([A-Z])/g, ' $1').trim()}: ${originalKey}\n\n${codeBlockLang ? '```' + codeBlockLang + '\n' : ''}${contentString}${codeBlockLang ? '\n```' : ''}\n`;
        })
        .join('\n---\n');

      filledTemplate = filledTemplate.substring(0, match.index) +
        dynamicContent +
        filledTemplate.substring(match.index + dynamicPlaceholder.length);
      dynamicPlaceholderRegex.lastIndex = match.index + dynamicContent.length;
    } else {
      filledTemplate = filledTemplate.replace(new RegExp(dynamicPlaceholder, 'g'), '');
      dynamicPlaceholderRegex.lastIndex = match.index;
    }
  }

  return filledTemplate;
}

export async function executeModelInteraction<T = any>(
  type: PromptType,
  context: Record<string, any>
): Promise<T> {
  if (!_modelManager) {
    throw new Error('PromptSystem not initialized. Call initializePromptSystem() first.');
  }

  const definition = PROMPT_DEFINITIONS[type];
  if (!definition) {
    throw new Error(`Unknown prompt type: ${type}`);
  }

  const variables = buildPromptVariables(type, context);
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
  _modelManager = null;
}