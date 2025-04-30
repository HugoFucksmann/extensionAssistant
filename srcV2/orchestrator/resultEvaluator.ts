import { OrchestrationContext } from '../core/context/orchestrationContext';
import { ConfigManager } from '../core/config/configManager';
import { Logger } from '../utils/logger';
import { BaseAPI } from '../models/baseAPI';
import { ExecutionPlan } from './planningEngine';
import { ToolRegistry } from '../tools/core/toolRegistry';

/**
 * Interfaz simplificada de evaluación de resultados
 */
export interface ResultEvaluation {
  success: boolean;
  confidence: number; // 0-1
  missingRequirements?: string[];
  suggestions?: {
    action: string;
    tool?: string;
    reason: string;
  }[];
}

export class ResultEvaluator {
  private orchestrationContext: OrchestrationContext;
  private configManager: ConfigManager;
  private logger: Logger;
  private modelAPI: BaseAPI;
  private toolRegistry: ToolRegistry;

  constructor(
    orchestrationContext: OrchestrationContext,
    configManager: ConfigManager,
    logger: Logger,
    modelAPI: BaseAPI,
    toolRegistry: ToolRegistry
  ) {
    this.orchestrationContext = orchestrationContext;
    this.configManager = configManager;
    this.logger = logger;
    this.modelAPI = modelAPI;
    this.toolRegistry = toolRegistry;
  }

  /**
   * Evalúa si los resultados cumplen con los objetivos del plan
   */
  public async evaluateResult(
    workflowResult: any,
    executionPlan: ExecutionPlan,
    originalInput: string
  ): Promise<ResultEvaluation> {
    try {
      // Obtener contexto consolidado
      const context = this.orchestrationContext.get();
      
      // Preparar prompt para el modelo
      const prompt = this.prepareEvaluationPrompt(
        workflowResult,
        executionPlan,
        originalInput,
        context
      );

      // Obtener evaluación del modelo
      const evaluation = await this.modelAPI.generateResponse(prompt);
      
      // Parsear y validar la respuesta
      return this.validateEvaluation(evaluation);
    } catch (error) {
      this.logger.error('[ResultEvaluator] Error evaluating result:', {error});
      return {
        success: false,
        confidence: 0,
        missingRequirements: ['Error during evaluation'],
        suggestions: [{
          action: 'Retry evaluation',
          reason: 'The evaluation process failed'
        }]
      };
    }
  }

  private prepareEvaluationPrompt(
    result: any,
    plan: ExecutionPlan,
    input: string,
    context: any
  ): string {
    return `
      Evalúa si los resultados cumplen con los objetivos del plan.
      Contexto:
      - Input original: ${input}
      - Objetivos del plan: ${JSON.stringify(plan.goals)}
      - Resultados obtenidos: ${JSON.stringify(result)}
      - Contexto de sesión: ${JSON.stringify(context.session || {})}
      
      Devuelve un JSON con:
      - success: boolean
      - confidence: number (0-1)
      - missingRequirements?: string[]
      - suggestions?: {action: string, tool?: string, reason: string}[]
    `;
  }

  private validateEvaluation(response: string): ResultEvaluation {
    try {
      const evaluation = JSON.parse(response) as ResultEvaluation;
      
      // Validación básica
      if (typeof evaluation.success !== 'boolean') {
        throw new Error('Invalid evaluation format');
      }
      
      return evaluation;
    } catch (error) {
      this.logger.warn('[ResultEvaluator] Invalid evaluation response:', {response});
      return {
        success: false,
        confidence: 0,
        missingRequirements: ['Invalid evaluation format']
      };
    }
  }
}