import { PromptType, buildPromptVariables, PromptVariables } from './types';
import { BaseAPI } from '../../models/baseAPI';
import { ConfigurationManager } from '../config/ConfigurationManager';

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

// Instancia interna de BaseAPI
let _baseAPIInstance: BaseAPI | null = null;

/**
 * Inicializa el sistema de prompts
 * @param configManager Instancia de ConfigurationManager
 */
export function initializePromptSystem(configManager: ConfigurationManager): void {
  _baseAPIInstance = new BaseAPI(configManager);
}

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
 * Punto de entrada único para todas las interacciones con el modelo
 * Esta función debe ser la única forma de interactuar con el modelo desde cualquier parte de la aplicación
 * @param type Tipo de prompt a ejecutar
 * @param context Contexto con variables para el prompt
 * @returns Respuesta parseada según el tipo de prompt
 */
export async function executeModelInteraction<T = any>(
  type: PromptType,
  context: Record<string, any>
): Promise<T> {
  if (!_baseAPIInstance) {
    throw new Error('PromptSystem no inicializado. Llame a initializePromptSystem() primero.');
  }
  return runPrompt<T>(type, context, _baseAPIInstance);
}

// Mantener runPrompt como función interna
async function runPrompt<T = any>(
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