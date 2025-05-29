import { logger } from './logger';

const JSON_EXTRACTION_REGEX = /```(?:json)?\n([\s\S]*?)\n```|({[\s\S]*})/;

/**
 * Limpia y extrae el JSON de una respuesta de modelo que puede contener:
 * - Triple backticks (```json o ```)
 * - Texto adicional antes/después
 * - Varios JSON anidados
 */
export function extractCleanJson(response: string): string | null {
  try {
    // Caso 1: Ya es un JSON válido
    if (isValidJson(response)) {
      return response;
    }

    // Caso 2: Contiene triple backticks
    const match = response.match(JSON_EXTRACTION_REGEX);
    if (match && (match[1] || match[2])) {
      const jsonStr = match[1] || match[2];
      if (isValidJson(jsonStr)) {
        return jsonStr;
      }
    }

    // Caso 3: Buscar el primer JSON válido en el texto
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const potentialJson = response.slice(jsonStart, jsonEnd + 1);
      if (isValidJson(potentialJson)) {
        return potentialJson;
      }
    }

    logger.warn('[ResponseCleaner] No se pudo extraer JSON válido de:', response);
    return null;
  } catch (error) {
    logger.error('[ResponseCleaner] Error limpiando respuesta:', error);
    return null;
  }
}

function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}
