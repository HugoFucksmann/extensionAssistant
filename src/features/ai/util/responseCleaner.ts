// En src/features/ai/util/responseCleaner.ts
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

  // Intentar parsear directamente
  try {
    return JSON.parse(cleanResponse);
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
