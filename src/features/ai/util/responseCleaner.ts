// En src/features/ai/util/responseCleaner.ts
/**
 * Limpia el string de posibles bloques markdown, prefijos y espacios, pero NO parsea ni valida.
 * Devuelve SIEMPRE un string limpio.
 */
export function cleanResponseString(rawResponse: string): string {
  if (!rawResponse || typeof rawResponse !== 'string') return rawResponse;
  return rawResponse
    .replace(/```(?:json\n)?([\s\S]*?)```/g, (_, code) => code.trim())
    .replace(/^[\s\n]*[\w\s]*JSON[\s\n]*[\{\[]/i, '{')
    .trim();
}

/**
 * Parsea y normaliza la respuesta del modelo a un objeto estructurado.
 * Usa cleanResponseString internamente. SOLO debe usarse después de que el parser de LangChain haya convertido el string en objeto.
 */
export function extractStructuredResponse(rawResponse: string): any {
  if (!rawResponse) return rawResponse;

  // Si no es string, devolver tal cual
  if (typeof rawResponse !== 'string') {
    return rawResponse;
  }

  // Limpiar el contenido de posibles bloques de código
  const cleanResponse = rawResponse
    // Eliminar bloques de código marcados con ```
    .replace(/```(?:json\n)?([\s\S]*?)```/g, (_, code) => {
      // Si es un bloque JSON, extraer solo el contenido
      return code.trim();
    })
    // Eliminar posibles prefijos/sufijos comunes
    .replace(/^[\s\n]*[\w\s]*JSON[\s\n]*[\{\[]/i, '{')
    .trim();

  // LOG antes de parsear
  console.log('[extractStructuredResponse] JSON a parsear:', cleanResponse);

  // Intentar parsear directamente
  try {
    const parsed = JSON.parse(cleanResponse);
    // Estandarizar: solo usar nextAction
    if (parsed && typeof parsed === 'object') {
      if (parsed.action) {
        parsed.nextAction = parsed.action;
        delete parsed.action;
      }
      // Validación/corrección de nextAction
      const validNextActions = ['use_tool', 'respond'];
      if (parsed.nextAction && !validNextActions.includes(parsed.nextAction)) {
        console.warn('[extractStructuredResponse] Valor inválido en nextAction:', parsed.nextAction, '-> Forzando a "respond"');
        parsed.nextAction = 'respond';
      }
      // Validar estructura mínima esperada
      const hasExpectedFields = (
        typeof parsed.nextAction === 'string' ||
        typeof parsed.response === 'string' ||
        typeof parsed.tool === 'string' ||
        typeof parsed.parameters === 'object'
      );
      if (!hasExpectedFields) {
        console.warn('[extractStructuredResponse] Objeto sin campos esperados, devolviendo objeto de error estructurado');
        return {
          nextAction: 'respond',
          response: '[Error] Respuesta del modelo no estructurada o inválida',
          raw: parsed
        };
      }
    }
    return parsed;
  } catch (e) {
    // Si falla, buscar el primer objeto/array JSON válido
    const jsonMatch = cleanResponse.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Si no se puede parsear, continuar al siguiente paso
      }
    }
  }

  // Si todo falla, devolver el contenido original
  return rawResponse;
}
