import { Logger } from '../../utils/logger';
import { BaseAPI } from '../../models/baseAPI';
import { OrchestrationContext } from '../../core/context/orchestrationContext';

export interface CommunicationModuleResult {
  success: boolean;
  message: string;
  codeSnippets?: {
    language: string;
    code: string;
    description: string;
  }[];
  suggestions?: string[];
  followUpQuestions?: string[];
  error?: string;
}

export class CommunicationModule {
  constructor(
    private logger: Logger,
    private modelApi: BaseAPI
  ) {
    this.logger.info('CommunicationModule inicializado');
    console.log(`[CommunicationModule] Inicializado`);
  }
  
  public async generateResponse(
    originalRequest: string,
    actionResults: any,
    context: OrchestrationContext
  ): Promise<CommunicationModuleResult> {
    try {
      this.logger.info('CommunicationModule: Generando respuesta', { originalRequest });
      console.log(`[CommunicationModule] Generando respuesta para solicitud: ${originalRequest}`);
      
      // Obtener el prompt desde el planificador de comunicación
      const response = await this.modelApi.generateResponse(
        this.preparePrompt(originalRequest, actionResults, context)
      );
      
      console.log(`[CommunicationModule] Respuesta generada (longitud: ${response.length})`);
      
      // Parsear la respuesta
      const parsedResponse = this.parseResponse(response);
      
      return {
        success: true,
        ...parsedResponse
      };
    } catch (error) {
      this.logger.error('CommunicationModule: Error generando respuesta', { error });
      console.error(`[CommunicationModule] Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      return {
        success: false,
        message: 'Lo siento, ha ocurrido un error al generar una respuesta.',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  private preparePrompt(
    originalRequest: string,
    actionResults: any,
    context: OrchestrationContext
  ): string {
    // Obtener el historial de conversación del contexto
    const contextData = context.get();
    const conversationHistory = contextData.contextItems || [];
    
    // Preparar el prompt con las variables
    const promptTemplate = `
Eres un asistente de desarrollo especializado en comunicación clara y efectiva. Tu tarea es generar una respuesta para el usuario basada en los resultados de las acciones realizadas.

CONTEXTO:
- Solicitud original del usuario: "{{originalRequest}}"
- Resultados de las acciones: {{actionResults}}
- Historial de conversación: {{conversationHistory}}

INSTRUCCIONES:
1. Analiza los resultados de las acciones realizadas.
2. Genera una respuesta clara y directa para el usuario.
3. Incluye información relevante y sugerencias si es apropiado.
4. Mantén un tono profesional pero conversacional.

Tu respuesta debe ser un objeto JSON con la siguiente estructura:
{
  "message": string,
  "codeSnippets": [
    {
      "language": string,
      "code": string,
      "description": string
    }
  ],
  "suggestions": string[],
  "followUpQuestions": string[]
}
`;
    
    // Reemplazar variables en el prompt
    return promptTemplate
      .replace('{{originalRequest}}', originalRequest)
      .replace('{{actionResults}}', JSON.stringify(actionResults))
      .replace('{{conversationHistory}}', JSON.stringify(conversationHistory));
  }
  
  private parseResponse(response: string): any {
    try {
      // Intentar parsear la respuesta como JSON
      const parsedResponse = JSON.parse(response);
      
      // Validar la estructura de la respuesta
      if (!parsedResponse.message) {
        throw new Error('Estructura de respuesta inválida');
      }
      
      return parsedResponse;
    } catch (error) {
      this.logger.error('CommunicationModule: Error parseando respuesta', { error, response });
      
      // Si no se puede parsear como JSON, devolver la respuesta como mensaje
      return {
        message: response,
        codeSnippets: [],
        suggestions: [],
        followUpQuestions: []
      };
    }
  }
}
