import { BaseAPI } from '../models/baseAPI';
import { PROMPTS } from './prompts';

/**
 * Agente encargado de generar la respuesta final para el usuario
 */
export class ResponseGenerationAgent {
  constructor(private modelAPI: BaseAPI) {}

  /**
   * Genera una respuesta final basada en toda la información recopilada
   * @param userQuery Consulta original del usuario
   * @param analysis Análisis del prompt
   * @param relevantFiles Archivos relevantes
   * @param codeExamination Resultado del examen de código
   * @returns Respuesta final para el usuario
   */
  public async generateResponse(
    userQuery: string,
    analysis: any,
    relevantFiles: any,
    codeExamination: any
  ): Promise<string> {
    try {
      // Extraer el problema principal del análisis
      const problem = analysis.objective || 'Resolver el problema del usuario';
      
      // Preparar los extractos de código consolidados
      const codeExtracts = codeExamination.consolidatedCodeExtracts || [];
      
      // Preparar los posibles problemas identificados
      const possibleIssues = codeExamination.possibleIssues || [];
      
      // Incluir análisis de causa raíz si está disponible
      const rootCauseAnalysis = codeExamination.rootCauseAnalysis || '';
      
      // Construir el prompt para la generación de respuesta
      let prompt = PROMPTS.RESPONSE_GENERATION
        .replace('{userQuery}', userQuery)
        .replace('{analysis}', JSON.stringify(analysis))
        .replace('{relevantFiles}', JSON.stringify(relevantFiles))
        .replace('{codeExtracts}', JSON.stringify(codeExtracts))
        .replace('{possibleIssues}', JSON.stringify(possibleIssues));
      
      // Añadir análisis de causa raíz si está disponible
      if (rootCauseAnalysis) {
        prompt += `\n\nANÁLISIS DE CAUSA RAÍZ:\n${rootCauseAnalysis}`;
      }
      
      console.log('Generando respuesta final con extractos de código:', codeExtracts.length);
      console.log('Posibles problemas identificados:', possibleIssues.length);
      
      // Generar respuesta con el modelo directamente a través de BaseAPI
      return await this.modelAPI.generateResponse(prompt);
    } catch (error) {
      console.error('Error al generar respuesta final:', error);
      // Devolver una respuesta genérica en caso de error
      return `Lo siento, no pude generar una respuesta completa para tu consulta "${userQuery}". 
      
Parece que hubo un problema al analizar la información. Puedes intentar reformular tu pregunta o proporcionar más detalles sobre el problema que estás enfrentando.`;
    }
  }
}
