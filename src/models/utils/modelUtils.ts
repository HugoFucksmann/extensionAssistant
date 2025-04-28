/**
 * Utilidades para el procesamiento de respuestas de modelos
 */

/**
 * Extrae contenido JSON válido de una respuesta de texto, incluso si está rodeado
 * de texto adicional o encerrado entre comillas triples.
 * 
 * @param text El texto completo de la respuesta
 * @param defaultValue Valor por defecto si no se puede extraer JSON
 * @returns El objeto JSON extraído o el valor por defecto
 */
export function extractJsonFromText<T>(text: string, defaultValue: T): T {
    if (!text || typeof text !== 'string') {
      return defaultValue;
    }
  
    // Intentar analizar directamente primero
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      // No es JSON válido directamente, intentar extraerlo
    }
  
    // Buscar JSON entre comillas triples
    const tripleQuotesRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const tripleQuotesMatch = text.match(tripleQuotesRegex);
    
    if (tripleQuotesMatch && tripleQuotesMatch[1]) {
      try {
        return JSON.parse(tripleQuotesMatch[1]) as T;
      } catch (e) {
        // No es JSON válido dentro de las comillas triples
      }
    }
  
    // Buscar cualquier objeto JSON válido en el texto
    const jsonRegex = /(\{[\s\S]*?\})/g;
    const jsonMatches = text.match(jsonRegex);
    
    if (jsonMatches) {
      for (const potentialJson of jsonMatches) {
        try {
          return JSON.parse(potentialJson) as T;
        } catch (e) {
          // Continuar con el siguiente match
        }
      }
    }
  
    // Si todo falla, devolver el valor por defecto
    return defaultValue;
  }
  
  /**
   * Procesa la respuesta de un modelo para extraer el contenido relevante.
   * 
   * @param response La respuesta del modelo
   * @param expectedJsonFormat Si se espera que la respuesta esté en formato JSON
   * @returns El contenido procesado de la respuesta
   */
  export function processModelResponse(response: string, expectedJsonFormat: boolean = false): string {
    if (!response) {
      return "No se recibió respuesta del modelo.";
    }
  
    // Si no esperamos JSON, devolver la respuesta tal cual
    if (!expectedJsonFormat) {
      return response;
    }
  
    // Intentar extraer JSON y obtener la propiedad 'content' o similar
    const jsonResponse = extractJsonFromText<any>(response, null);
    
    if (jsonResponse) {
      // Buscar propiedades comunes que podrían contener el contenido principal
      for (const prop of ['content', 'message', 'text', 'response']) {
        if (typeof jsonResponse[prop] === 'string') {
          return jsonResponse[prop];
        }
      }
      
      // Si no encontramos ninguna propiedad conocida pero tenemos JSON válido,
      // convertirlo de nuevo a string formateado
      return JSON.stringify(jsonResponse, null, 2);
    }
    
    // Si no pudimos extraer JSON válido, devolver la respuesta original
    return response;
  }