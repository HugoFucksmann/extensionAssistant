import { reasoningOutputSchema, reasoningPromptLC } from "../prompts/optimized/reasoningPrompt";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { JsonOutputParser } from "@langchain/core/output_parsers";

// Función para normalizar la respuesta del modelo
function normalizeReasoningResponse(response: any) {
  if (response && typeof response === 'object') {
    // Mapear acciones en español a los valores esperados en inglés
    const actionMap: Record<string, 'use_tool' | 'respond'> = {
      'usar_herramienta': 'use_tool',
      'responder': 'respond',
      'use_tool': 'use_tool',
      'respond': 'respond'
    };

    const normalizedAction = actionMap[String(response.action || '').toLowerCase()] || 'respond';

    return {
      reasoning: String(response.reasoning || ''),
      action: normalizedAction,
      tool: normalizedAction === 'use_tool' ? String(response.tool || '') : undefined,
      parameters: normalizedAction === 'use_tool' ? (response.parameters || {}) : undefined,
      response: normalizedAction === 'respond' ? String(response.response || '') : undefined
    };
  }
  return null;
}

/**
 * Ejecuta la cadena LCEL para la fase de razonamiento optimizado.
 * Recibe los parámetros necesarios y retorna el objeto parseado según reasoningOutputSchema.
 */
export async function runOptimizedReasoningChain({
  userQuery,
  analysisResult,
  toolsDescription,
  previousToolResults,
  memoryContext,
  model
}: {
  userQuery: string;
  analysisResult: any;
  toolsDescription: string;
  previousToolResults?: Array<{ name: string; result: any }>;
  memoryContext?: string;
  model: BaseChatModel;
}) {
  const defaultResponse = {
    reasoning: 'Analizando la mejor forma de proceder...',
    action: 'respond' as const,
    response: 'Voy a ayudarte con eso.'
  };

  try {
    // Construir el contexto
    let context = '';
    if (memoryContext) {
      context += `MEMORIA RELEVANTE:\n${memoryContext}\n\n`;
    }
    context += `ANÁLISIS PREVIO:\n${JSON.stringify(analysisResult, null, 2)}\n\n`;
    context += `HERRAMIENTAS DISPONIBLES:\n${toolsDescription}\n\n`;

    if (previousToolResults?.length) {
      context += 'RESULTADOS PREVIOS DE HERRAMIENTAS:\n';
      previousToolResults.forEach(({ name, result }) => {
        context += `## ${name}\n${JSON.stringify(result, null, 2)}\n\n`;
      });
    }

    // Usar el prompt optimizado
    const prompt = reasoningPromptLC;
    const parser = new JsonOutputParser();
    
    // Encadenar: prompt -> modelo -> parser
    const chain = prompt.pipe(model).pipe(parser);

    // Ejecutar la cadena con las variables necesarias
    const rawResult = await chain.invoke({
      userQuery,
      analysisResult: JSON.stringify(analysisResult, null, 2),
      toolsDescription,
      previousToolResults: previousToolResults?.map(r => ({
        name: r.name,
        result: typeof r.result === 'string' ? r.result : JSON.stringify(r.result, null, 2)
      })) || [],
      memoryContext: memoryContext || ''
    });

    console.log('Respuesta cruda del modelo (razonamiento):', JSON.stringify(rawResult, null, 2));

    // Normalizar la respuesta
    const normalizedResult = normalizeReasoningResponse(rawResult);
    if (!normalizedResult) {
      console.error('No se pudo normalizar la respuesta del modelo');
      return defaultResponse;
    }

    // Validar contra el esquema
    const validation = reasoningOutputSchema.safeParse(normalizedResult);
    if (!validation.success) {
      console.error('Error de validación del esquema:', validation.error);
      return defaultResponse;
    }

    return validation.data;
  } catch (error) {
    console.error('Error en runOptimizedReasoningChain:', error);
    return defaultResponse;
  }
}
