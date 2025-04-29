/**
 * Evaluador de Resultados
 * 
 * Responsabilidad: Evaluar los resultados de las acciones ejecutadas.
 * Este componente verifica si los resultados obtenidos cumplen con los
 * objetivos establecidos y determina si se necesitan acciones adicionales.
 */

import { SessionContext } from '../core/context/sessionContext';
import { ProjectContext } from '../core/context/projectContext';
import { CodeContext } from '../core/context/codeContext';
import { ConfigManager } from '../core/config/configManager';
import { Logger } from '../utils/logger';
import { EventBus } from '../core/event/eventBus';
import { BaseAPI } from '../models/baseAPI';
import { ExecutionPlan } from './planningEngine';

/**
 * Interfaz que define la evaluación de un resultado
 */
export interface ResultEvaluation {
  success: boolean;
  completionLevel: "partial" | "complete" | "exceeds";
  qualityAssessment: "poor" | "adequate" | "good" | "excellent";
  missingElements: string[];
  additionalStepsNeeded: {
    description: string;
    reason: string;
    toolSuggestion: string;
  }[];
  requiresUserInput: boolean;
}

/**
 * Clase para evaluar resultados
 */
export class ResultEvaluator {
  private sessionContext: SessionContext;
  private projectContext: ProjectContext;
  private codeContext: CodeContext;
  private configManager: ConfigManager;
  private logger: Logger;
  private eventBus: EventBus;
  private modelApi: BaseAPI;

  constructor(
    sessionContext: SessionContext,
    projectContext: ProjectContext,
    codeContext: CodeContext,
    configManager: ConfigManager,
    logger: Logger,
    eventBus: EventBus,
    modelApi: BaseAPI
  ) {
    this.sessionContext = sessionContext;
    this.projectContext = projectContext;
    this.codeContext = codeContext;
    this.configManager = configManager;
    this.logger = logger;
    this.eventBus = eventBus;
    this.modelApi = modelApi;
  }

  /**
   * Evalúa el resultado de una ejecución
   * @param result El resultado a evaluar
   * @param plan El plan de ejecución
   * @param originalInput La entrada original del usuario
   * @returns Una evaluación del resultado
   */
  public async evaluateResult(
    result: any,
    plan: ExecutionPlan,
    originalInput: string
  ): Promise<ResultEvaluation> {
    try {
      this.logger.info('ResultEvaluator: Evaluating result', { originalInput });
      
      // Obtener el contexto relevante
      const sessionData = this.sessionContext.getSessionData();
      const projectData = this.projectContext.getContextData();
      const codeData = this.codeContext.getContextData();
      
      // Preparar el prompt para el modelo
      const prompt = this.preparePrompt(
        result,
        plan,
        originalInput,
        sessionData,
        projectData,
        codeData
      );
      
      // Obtener la evaluación del modelo
      const modelResponse = await this.modelApi.getCompletion(prompt, {
        temperature: 0.1,
        max_tokens: 1000,
        prompt_name: 'result_evaluator'
      });
      
      // Parsear la respuesta del modelo
      const evaluation = this.parseModelResponse(modelResponse);
      
      // Emitir evento de evaluación completada
      this.eventBus.emit('result:evaluated', evaluation);
      
      return evaluation;
    } catch (error) {
      this.logger.error('ResultEvaluator: Error evaluating result', { error });
      return this.getDefaultEvaluation(result, plan, originalInput);
    }
  }

  /**
   * Prepara el prompt para el modelo
   * @param result El resultado a evaluar
   * @param plan El plan de ejecución
   * @param originalInput La entrada original del usuario
   * @param sessionData Los datos de la sesión
   * @param projectData Los datos del proyecto
   * @param codeData Los datos del código
   * @returns El prompt preparado
   */
  private preparePrompt(
    result: any,
    plan: ExecutionPlan,
    originalInput: string,
    sessionData: any,
    projectData: any,
    codeData: any
  ): string {
    // Obtener el prompt desde el sistema de prompts
    const promptTemplate = this.configManager.getPromptTemplate('resultEvaluator');
    
    // Reemplazar variables en el prompt
    const filledPrompt = promptTemplate
      .replace('{{originalInput}}', originalInput)
      .replace('{{plan}}', JSON.stringify(plan))
      .replace('{{result}}', JSON.stringify(result))
      .replace('{{sessionContext}}', JSON.stringify(sessionData))
      .replace('{{projectContext}}', JSON.stringify(projectData))
      .replace('{{codeContext}}', JSON.stringify(codeData));
      
    return filledPrompt;
  }

  /**
   * Parsea la respuesta del modelo a un objeto ResultEvaluation
   * @param modelResponse La respuesta del modelo
   * @returns Un objeto ResultEvaluation
   */
  private parseModelResponse(modelResponse: string): ResultEvaluation {
    try {
      // Intentar parsear la respuesta como JSON
      const parsedResponse = JSON.parse(modelResponse);
      
      // Validar que la respuesta tenga la estructura esperada
      if (!this.validateEvaluationStructure(parsedResponse)) {
        throw new Error('Invalid response structure from model');
      }
      
      return parsedResponse as ResultEvaluation;
    } catch (error) {
      this.logger.error('ResultEvaluator: Error parsing model response', { error, modelResponse });
      throw new Error(`Failed to parse model response: ${error.message}`);
    }
  }

  /**
   * Valida que un objeto tenga la estructura esperada para ResultEvaluation
   * @param obj El objeto a validar
   * @returns true si el objeto tiene la estructura esperada, false en caso contrario
   */
  private validateEvaluationStructure(obj: any): boolean {
    const requiredFields = [
      'success',
      'completionLevel',
      'qualityAssessment',
      'missingElements',
      'additionalStepsNeeded',
      'requiresUserInput'
    ];
    
    // Verificar que todos los campos requeridos existan
    const hasAllFields = requiredFields.every(field => field in obj);
    
    // Verificar que los campos enum tengan valores válidos
    const validCompletionLevels = ['partial', 'complete', 'exceeds'];
    const validQualityAssessments = ['poor', 'adequate', 'good', 'excellent'];