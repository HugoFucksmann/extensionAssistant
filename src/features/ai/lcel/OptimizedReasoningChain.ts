import { reasoningPromptLC, reasoningOutputParser } from "../prompts/optimized/reasoningPrompt";
import { formatForPrompt } from "../prompts/promptUtils";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";


/* function normalizeReasoningResponse(response: any) {
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
} */


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
  // Formatear los parámetros para el prompt centralizado
  const promptInput = {
    userQuery,
    analysisResult: formatForPrompt(analysisResult),
    toolsDescription,
    previousToolResults: formatForPrompt(previousToolResults || []),
    memoryContext: memoryContext || ''
  };

  // Encadenar: prompt centralizado -> modelo -> parser centralizado
  const chain = reasoningPromptLC.pipe(model).pipe(reasoningOutputParser);
  const { invokeModelWithLogging } = await import('./ModelInvokeLogger');
  return await invokeModelWithLogging(chain, promptInput, { caller: 'runOptimizedReasoningChain' });
}
