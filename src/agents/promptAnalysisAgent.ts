import { ModelAPIProvider } from '../models/modelApiProvider';
import { PROMPTS } from './prompts';

/**
 * Agente encargado de analizar el prompt del usuario y generar un plan inicial
 */
export class PromptAnalysisAgent {
  constructor(private modelProvider: ModelAPIProvider) {}

  /**
   * Analiza el prompt del usuario y genera un plan inicial
   * @param userQuery Consulta del usuario
   * @returns Análisis y plan inicial
   */
  public async analyze(userQuery: string): Promise<any> {
    try {
      // Construir el prompt para el análisis
      const prompt = PROMPTS.PROMPT_ANALYSIS.replace('{userQuery}', userQuery);
      
      // Generar respuesta con el modelo
      const response = await this.modelProvider.generateResponse(prompt);
      
      // Parsear la respuesta JSON
      return this.parseJsonResponse(response);
    } catch (error) {
      console.error('Error al analizar prompt:', error);
      // Devolver un análisis básico en caso de error
      return {
        objective: "Responder a la consulta del usuario",
        keywords: this.extractBasicKeywords(userQuery),
        problemType: "desconocido",
        actionPlan: {
          steps: [
            {
              id: 1,
              description: "Buscar archivos relevantes",
              actionType: "buscar_archivos"
            },
            {
              id: 2,
              description: "Generar respuesta",
              actionType: "generar_respuesta"
            }
          ]
        }
      };
    }
  }

  /**
   * Extrae palabras clave básicas del texto
   * @param text Texto a analizar
   * @returns Lista de palabras clave
   */
  private extractBasicKeywords(text: string): string[] {
    // Eliminar palabras comunes y extraer posibles nombres de funciones, archivos, etc.
    const words = text.split(/\s+/);
    const commonWords = ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'a', 'de', 'en', 'con', 'por', 'para'];
    
    return words
      .filter(word => word.length > 3 && !commonWords.includes(word.toLowerCase()))
      .filter(word => /[A-Za-z0-9_\-.]+/.test(word));
  }

  /**
   * Parsea la respuesta JSON del modelo
   * @param response Respuesta del modelo
   * @returns Objeto JSON parseado
   */
  private parseJsonResponse(response: string): any {
    try {
      // Intentar extraer JSON de la respuesta
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                        response.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[0].replace(/```json\n|```/g, '');
        return JSON.parse(jsonStr);
      }
      
      // Si no se puede extraer JSON, intentar parsear toda la respuesta
      return JSON.parse(response);
    } catch (error) {
      console.error('Error al parsear respuesta JSON:', error);
      throw error;
    }
  }
}
