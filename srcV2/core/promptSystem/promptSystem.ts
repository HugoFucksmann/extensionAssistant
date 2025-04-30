import { PromptType, buildPromptVariables, PromptVariables } from './types';

import { BaseAPI } from '../../models/baseAPI';

// Importa los templates
import { inputAnalyzerPrompt } from './prompts/prompt.inputAnalyzer';
import { planningEnginePrompt } from './prompts/prompt.planningEngine';
import { communicationPrompt } from './prompts/prompt.communication';
import { editingPrompt } from './prompts/prompt.editing';
import { examinationPrompt } from './prompts/prompt.examination';
import { projectManagementPrompt } from './prompts/prompt.projectManagement';
import { projectSearchPrompt } from './prompts/prompt.projectSearch';
import { resultEvaluatorPrompt } from './prompts/prompt.resultEvaluator';
import { toolSelectorPrompt } from './prompts/prompt.toolSelector';
import { parseModelResponse } from '../../utils/parseModelResponse';


const PROMPT_MAP: Record<PromptType, string> = {
    inputAnalyzer: inputAnalyzerPrompt,
    planningEngine: planningEnginePrompt,
    communication: communicationPrompt,
    editing: editingPrompt,
    examination: examinationPrompt,
    projectManagement: projectManagementPrompt,
    projectSearch: projectSearchPrompt,
    resultEvaluator: resultEvaluatorPrompt,
    toolSelector: toolSelectorPrompt,
  };

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

export async function runPrompt<T = any>(
  type: PromptType,
  context: Record<string, any>,
  modelApi: BaseAPI
): Promise<T> {
  const template = PROMPT_MAP[type];
  if (!template) throw new Error(`Prompt no encontrado para el tipo: ${type}`);
  const variables = buildPromptVariables(type, context);
  const filledPrompt = fillPromptTemplate(template, variables);
  console.log(`[PromptSystem] Enviando prompt al modelo: ${filledPrompt}`);
  const rawResponse = await modelApi.generateResponse(filledPrompt);
  return parseModelResponse<T>(type, rawResponse);
}