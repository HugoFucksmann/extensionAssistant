import { ConfigManager } from '../../core/config/configManager';
import { Logger } from '../../utils/logger';
import { BaseAPI } from '../../models/baseAPI';
import { PromptType } from '../../core/prompts/promptManager';

export interface CommunicationPlan {
  responseType: 'direct' | 'structured';
  includeCodeSnippets: boolean;
  includeSuggestions: boolean;
  includeFollowUpQuestions: boolean;
  tone: 'formal' | 'conversational' | 'technical';
}

export class CommunicationPlanner {
  constructor(
    private configManager: ConfigManager,
    private logger: Logger,
    private modelApi: BaseAPI
  ) {
    this.logger.info('CommunicationPlanner inicializado');
    console.log(`[CommunicationPlanner] Inicializado`);
  }
  
  public async createCommunicationPlan(
    originalRequest: string,
    actionResults: any
  ): Promise<CommunicationPlan> {
    try {
      this.logger.info('CommunicationPlanner: Creando plan de comunicación', { originalRequest });
      console.log(`[CommunicationPlanner] Creando plan para: ${originalRequest}`);
      
      // Obtener el prompt template
      const promptTemplate = this.configManager.getPromptTemplate('communication' as PromptType);
      
      // Preparar variables para el template
      const variables = {
        originalRequest,
        actionResults: JSON.stringify(actionResults)
      };
      
      // Llenar el template con las variables
      const filledPrompt = Object.entries(variables).reduce(
        (prompt, [key, value]) => prompt.replace(new RegExp(`{{${key}}}`, 'g'), value),
        promptTemplate
      );
      
      console.log(`[CommunicationPlanner] Enviando prompt al modelo (longitud: ${filledPrompt.length})`);
      
      // Obtener respuesta del modelo
      const modelResponse = await this.modelApi.generateResponse(filledPrompt);
      
      console.log(`[CommunicationPlanner] Respuesta recibida (longitud: ${modelResponse.length})`);
      
      // Parsear la respuesta
      const plan = this.parseModelResponse(modelResponse);
      
      return plan;
    } catch (error) {
      this.logger.error('CommunicationPlanner: Error creando plan', { error });
      console.error(`[CommunicationPlanner] Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      // Devolver un plan por defecto en caso de error
      return {
        responseType: 'direct',
        includeCodeSnippets: false,
        includeSuggestions: false,
        includeFollowUpQuestions: false,
        tone: 'conversational'
      };
    }
  }
  
  private parseModelResponse(response: string): CommunicationPlan {
    try {
      // Intentar parsear la respuesta como JSON
      const parsedResponse = JSON.parse(response);
      
      // Validar la estructura del plan
      if (!parsedResponse.responseType) {
        throw new Error('Estructura de plan inválida');
      }
      
      return {
        responseType: parsedResponse.responseType || 'direct',
        includeCodeSnippets: parsedResponse.includeCodeSnippets || false,
        includeSuggestions: parsedResponse.includeSuggestions || false,
        includeFollowUpQuestions: parsedResponse.includeFollowUpQuestions || false,
        tone: parsedResponse.tone || 'conversational'
      };
    } catch (error) {
      this.logger.error('CommunicationPlanner: Error parseando respuesta', { error, response });
      
      // Devolver un plan por defecto en caso de error
      return {
        responseType: 'direct',
        includeCodeSnippets: false,
        includeSuggestions: false,
        includeFollowUpQuestions: false,
        tone: 'conversational'
      };
    }
  }
}
