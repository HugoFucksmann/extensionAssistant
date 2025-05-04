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

/**
 * Ejecuta un prompt con el modelo de IA
 * @param type Tipo de prompt a ejecutar
 * @param context Contexto con variables para el prompt
 * @param modelApi API del modelo a utilizar
 * @returns Respuesta parseada según el tipo de prompt
 */
export async function runPrompt<T = any>(
  type: PromptType,
  context: Record<string, any>,
  modelApi: BaseAPI
): Promise<T> {
  const template = PROMPT_MAP[type];
  const variables = buildPromptVariables(type, context);
  const filledPrompt = fillPromptTemplate(template, variables);
  
  const rawResponse = await modelApi.generateResponseInternal(filledPrompt);
  
  // Aquí se aplicaría tu nueva función
  const jsonResponse = rawResponse
  
  return jsonResponse as T;
}

/**
 * Punto de entrada único para todas las interacciones con el modelo
 * Esta función debe ser la única forma de interactuar con el modelo desde cualquier parte de la aplicación
 * @param type Tipo de prompt a ejecutar
 * @param context Contexto con variables para el prompt
 * @param modelApi API del modelo a utilizar
 * @returns Respuesta parseada según el tipo de prompt
 */
export async function executeModelInteraction<T = any>(
  type: PromptType,
  context: Record<string, any>,
  modelApi: BaseAPI
): Promise<T> {
  try {
    return await runPrompt<T>(type, context, modelApi);
  } catch (error) {
    console.error(`[PromptSystem] Error al ejecutar prompt ${type}:`, error);
    throw error;
  }
}