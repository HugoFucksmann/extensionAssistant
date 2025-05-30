import { reasoningOutputSchema, reasoningPromptLC } from "../prompts/optimized/reasoningPrompt";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { JsonOutputParser } from "@langchain/core/output_parsers";


function normalizeReasoningResponse(response: any) {
  if (response && typeof response === 'object') {
    
    const actionMap: Record<string, 'use_tool' | 'respond'> = {
      'usar_herramienta': 'use_tool',
      'responder': 'respond',
      'use_tool': 'use_tool',
      'respond': 'respond'
    };

    const normalizedAction = actionMap[String(response.nextAction || '').toLowerCase()] || 'respond';

    return {
      reasoning: String(response.reasoning || ''),
      nextAction: normalizedAction,
      tool: normalizedAction === 'use_tool' ? String(response.tool || '') : undefined,
      parameters: normalizedAction === 'use_tool' ? (response.parameters || {}) : undefined,
      response: normalizedAction === 'respond' ? String(response.response || '') : undefined
    };
  }
  return null;
}


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
    nextAction: 'respond' as const,
    response: 'Voy a ayudarte con eso.'
  };

  try {
   
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

 
    const prompt = reasoningPromptLC;
    const parser = new JsonOutputParser();
    
   
    const chain = prompt.pipe(model).pipe(parser);

    const { invokeModelWithLogging } = await import('./ModelInvokeLogger');
    const rawResult = await invokeModelWithLogging(chain, {
      userQuery,
      analysisResult: JSON.stringify(analysisResult, null, 2),
      toolsDescription,
      previousToolResults: previousToolResults?.map(r => ({
        name: r.name,
        result: typeof r.result === 'string' ? r.result : JSON.stringify(r.result, null, 2)
      })) || [],
      memoryContext: memoryContext || ''
    }, { caller: 'runOptimizedReasoningChain' });

    const normalizedResult = normalizeReasoningResponse(rawResult);
    if (!normalizedResult) {
      console.error('[OptimizedReasoningChain] No se pudo normalizar la respuesta del modelo. Respuesta cruda:',
        rawResult === undefined ? 'undefined'
        : rawResult === null ? 'null'
        : typeof rawResult === 'string' ? rawResult
        : JSON.stringify(rawResult, null, 2)
      );
      return defaultResponse;
    }

    const validation = reasoningOutputSchema.safeParse(normalizedResult);
    if (!validation.success) {
      console.error('[OptimizedReasoningChain] Error de validación del esquema:', validation.error);
      console.error('[OptimizedReasoningChain] Respuesta cruda antes de validación:',
        rawResult === undefined ? 'undefined'
        : rawResult === null ? 'null'
        : typeof rawResult === 'string' ? rawResult
        : JSON.stringify(rawResult, null, 2)
      );
      return defaultResponse;
    }

    return validation.data;
  } catch (error) {
    console.error('Error en runOptimizedReasoningChain:', error);
    return defaultResponse;
  }
}
