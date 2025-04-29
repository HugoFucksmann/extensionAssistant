/**
 * Analizador de Entrada
 * 
 * Responsabilidad: Analizar y categorizar las solicitudes del usuario.
 * Este componente determina el tipo de solicitud y decide si se necesita
 * planificación completa o si se puede manejar como una acción directa.
 */

import { SessionContext } from '../core/context/sessionContext';
import { ProjectContext } from '../core/context/projectContext';
import { CodeContext } from '../core/context/codeContext';
import { ConfigManager } from '../core/config/configManager';
import { Logger } from '../utils/logger';
import { EventBus } from '../core/event/eventBus';
import { BaseAPI } from '../models/baseAPI';

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
   * Analiza una entrada del usuario
   * @param input La entrada del usuario a analizar
   * @returns Un análisis de la entrada
   */
  public async analyzeInput(input: string): Promise<InputAnalysis> {
    try {
      this.logger.info('InputAnalyzer: Analyzing input', { input });
      
      // Obtener el contexto relevante
      const sessionData = this.sessionContext.getSessionData();
      const projectData = this.projectContext.getContextData();
      const codeData = this.codeContext.getContextData();
      
      // Preparar el prompt para el modelo
      const prompt = this.preparePrompt(input, sessionData, projectData, codeData);
      
      // Obtener el análisis del modelo
      const modelResponse = await this.modelApi.getCompletion(prompt, {
        temperature: 0.1,
        max_tokens: 1000,
        prompt_name: 'input_analyzer'
      });
      
      // Parsear la respuesta del modelo
      const analysis = this.parseModelResponse(modelResponse);
      
      // Emitir evento de análisis completado
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
   * @param sessionData Datos de la sesión
   * @param projectData Datos del proyecto
   * @param codeData Datos del código
   * @returns El prompt preparado
   */
  private preparePrompt(
    input: string,
    sessionData: any,
    projectData: any,
    codeData: any
  ): string {
    // Obtener el prompt desde el sistema de prompts
    const promptTemplate = this.configManager.getPromptTemplate('inputAnalyzer');
    
    // Reemplazar variables en el prompt
    const filledPrompt = promptTemplate
      .replace('{{input}}', input)
      .replace('{{sessionContext}}', JSON.stringify(sessionData))
      .replace('{{projectContext}}', JSON.stringify(projectData))
      .replace('{{codeContext}}', JSON.stringify(codeData));
      
    return filledPrompt;
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
    } catch (error) {
      this.logger.error('InputAnalyzer: Error parsing model response', { error, modelResponse });
      throw new Error(`Failed to parse model response: ${error.message}`);
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