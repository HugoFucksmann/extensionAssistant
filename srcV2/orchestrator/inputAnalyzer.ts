/**
 * Analizador de Entrada
 * 
 * Responsabilidad: Analizar y categorizar las solicitudes del usuario.
 * Este componente determina el tipo de solicitud y decide si se necesita
 * planificación completa o si se puede manejar como una acción directa.
 */

import { ConfigManager } from '../core/config/configManager';
import { OrchestrationContext } from '../core/context/orchestrationContext';
import { Logger } from '../utils/logger';
import { EventBus } from '../core/event/eventBus';
import { BaseAPI } from '../models/baseAPI';
import { PromptType } from '../core/prompts/promptManager';
/**
 * Interfaz que define el análisis de una entrada
 */
export interface InputAnalysis {
  needsFullPlanning: boolean;
  category: "codeExamination" | "codeEditing" | "projectManagement" | "communication" | "projectSearch";
  directAction: {
    tool: string;
    params: object;
  } | null;
  confidence: number;
  relevantContext: string[];
  intentClassification: string;
}

/**
 * Clase para analizar entradas del usuario
 */
export class InputAnalyzer {
  private configManager: ConfigManager;
  private orchestrationContext: OrchestrationContext;
  private logger: Logger;
  private eventBus: EventBus;
  private modelApi: BaseAPI;

  constructor(
    configManager: ConfigManager,
    orchestrationContext: OrchestrationContext,
    logger: Logger,
    eventBus: EventBus,
    modelApi: BaseAPI
  ) {
    this.configManager = configManager;
    this.orchestrationContext = orchestrationContext;
    this.logger = logger;
    this.eventBus = eventBus;
    this.modelApi = modelApi;
  }

  /**
   * Analiza una entrada del usuario
   * @param input La entrada del usuario a analizar
   * @returns Un análisis de la entrada
   */
  public async analyzeInput(input: string): Promise<InputAnalysis> {
    try {
      this.logger.info('InputAnalyzer: Analyzing input', { input });
      console.log(`[InputAnalyzer] Iniciando análisis de entrada: "${input.substring(0, 100)}${input.length > 100 ? '...' : ''}"`);
      
      // Obtener el contexto de orquestación
      const contextData = this.orchestrationContext.get();
      console.log(`[InputAnalyzer] Contexto de orquestación obtenido: sessionId=${contextData.sessionId}`);
      
      // Preparar el prompt para el modelo
      const prompt = this.preparePrompt(input, contextData);
      console.log(`[InputAnalyzer] Prompt preparado (longitud: ${prompt.length} caracteres)`);
      
      // Obtener el análisis del modelo
      console.log(`[InputAnalyzer] Enviando prompt al modelo...`);
      const modelResponse = await this.modelApi.generateResponse(prompt);
      console.log(`[InputAnalyzer] Respuesta recibida del modelo (longitud: ${modelResponse.length} caracteres)`);
      
      // Parsear la respuesta del modelo
      console.log(`[InputAnalyzer] Parseando respuesta del modelo...`);
      const analysis = this.parseModelResponse(modelResponse);
      console.log(`[InputAnalyzer] Análisis completado: needsFullPlanning=${analysis.needsFullPlanning}, category=${analysis.category}, confidence=${analysis.confidence}`);
      
      // Emitir evento de análisis completado
      console.log(`[InputAnalyzer] Emitiendo evento 'input:analyzed'`);
      this.eventBus.emit('input:analyzed', analysis);
      
      return analysis;
    } catch (error) {
      this.logger.error('InputAnalyzer: Error analyzing input', { error });
      
      // En caso de error, devolver un análisis por defecto
      return this.getDefaultAnalysis(input);
    }
  }

  /**
   * Prepara el prompt para el modelo
   * @param input La entrada del usuario
   * @param contextData Contexto de orquestación
   * @returns El prompt preparado
   */
  private preparePrompt(input: string, contextData: any): string {
    try {
      // Obtener el template desde configManager
      const promptTemplate = this.configManager.getPromptTemplate('inputAnalyzer' as PromptType);
      
      // Preparar variables para el template
      const variables = {
        userPrompt: input,
        referencedFiles: JSON.stringify(contextData.referencedFiles || []),
        functionNames: JSON.stringify(contextData.functionNames || []),
        projectContext: JSON.stringify(contextData.projectData || {})
      };
      
      // Llenar el template con las variables
      const filledPrompt = Object.entries(variables).reduce(
        (prompt, [key, value]) => prompt.replace(new RegExp(`{{${key}}}`, 'g'), value),
        promptTemplate
      );
      
      return filledPrompt;
    } catch (error) {
      this.logger.warn('Error al preparar el prompt, usando template por defecto', { error });
      return `Analiza la siguiente entrada: ${input}`;
    }
  }

  /**
   * Parsea la respuesta del modelo a un objeto InputAnalysis
   * @param modelResponse La respuesta del modelo
   * @returns Un objeto InputAnalysis
   */
  private parseModelResponse(modelResponse: string): InputAnalysis {
    try {
      // Intentar parsear la respuesta como JSON
      const parsedResponse = JSON.parse(modelResponse);
      
      // Validar que la respuesta tenga la estructura esperada
      if (!this.validateAnalysisStructure(parsedResponse)) {
        throw new Error('Invalid response structure from model');
      }
      
      return parsedResponse as InputAnalysis;
    } catch (error: unknown) {
      this.logger.error('InputAnalyzer: Error parsing model response', { 
        error, 
        modelResponse 
      });
      
      // Manejar el error con tipado correcto
      if (error instanceof Error) {
        throw new Error(`Failed to parse model response: ${error.message}`);
      } else {
        throw new Error(`Failed to parse model response: Unknown error`);
      }
    }
  }

  /**
   * Valida que un objeto tenga la estructura esperada para InputAnalysis
   * @param obj El objeto a validar
   * @returns true si el objeto tiene la estructura esperada, false en caso contrario
   */
  private validateAnalysisStructure(obj: any): boolean {
    const requiredFields = [
      'needsFullPlanning',
      'category',
      'directAction',
      'confidence',
      'relevantContext',
      'intentClassification'
    ];
    
    // Verificar que todos los campos requeridos existan
    const hasAllFields = requiredFields.every(field => field in obj);
    
    // Verificar que la categoría sea válida
    const validCategories = [
      'codeExamination',
      'codeEditing',
      'projectManagement',
      'communication',
      'projectSearch'
    ];
    const hasValidCategory = validCategories.includes(obj.category);
    
    return hasAllFields && hasValidCategory;
  }

  /**
   * Obtiene un análisis por defecto en caso de error
   * @param input La entrada del usuario
   * @returns Un análisis por defecto
   */
  private getDefaultAnalysis(input: string): InputAnalysis {
    return {
      needsFullPlanning: true,
      category: 'communication',
      directAction: null,
      confidence: 0.5,
      relevantContext: [],
      intentClassification: 'general_query'
    };
  }
}