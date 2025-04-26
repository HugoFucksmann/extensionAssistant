import { BaseAPI } from '../models/baseAPI';
import { PROMPTS } from './prompts';

/**
 * Agente encargado de analizar el prompt del usuario
 * Extrae información clave y genera un plan de acción
 */
export class PromptAnalysisAgent {
  constructor(private modelAPI: BaseAPI) {}

  /**
   * Analiza el prompt del usuario y extrae información clave
   * @param userQuery Consulta del usuario
   * @returns Análisis del prompt con objetivo, palabras clave y plan
   */
  public async analyze(userQuery: string): Promise<any> {
    try {
      console.log('Analizando prompt:', userQuery);
      
      // Construir el prompt para el análisis
      const prompt = PROMPTS.PROMPT_ANALYSIS.replace('{userQuery}', userQuery);
      
      // Obtener respuesta del modelo
      const response = await this.modelAPI.generateResponse(prompt);
      
      // Parsear la respuesta JSON
      try {
        const parsedResponse = JSON.parse(response);
        console.log('Análisis completado:', parsedResponse);
        return parsedResponse;
      } catch (parseError) {
        console.error('Error al parsear respuesta JSON del análisis:', parseError);
        console.log('Respuesta cruda:', response);
        
        // Intentar extraer JSON si está rodeado de texto
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extractedJson = jsonMatch[0];
            console.log('Intentando parsear JSON extraído:', extractedJson);
            return JSON.parse(extractedJson);
          } catch (extractError) {
            console.error('Error al parsear JSON extraído:', extractError);
          }
        }
        
        // Devolver un análisis básico en caso de error
        return {
          objective: userQuery,
          keywords: userQuery.split(' ').filter(word => word.length > 3),
          problemType: "consulta",
          actionPlan: {
            steps: [
              { id: 1, description: "Buscar archivos relevantes", actionType: "buscar_archivos" },
              { id: 2, description: "Examinar código", actionType: "examinar_codigo" },
              { id: 3, description: "Generar respuesta", actionType: "generar_respuesta" }
            ]
          }
        };
      }
    } catch (error) {
      console.error('Error en análisis de prompt:', error);
      throw error;
    }
  }
}
