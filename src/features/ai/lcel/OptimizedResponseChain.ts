import { responsePromptLC, responseOutputParser } from "../prompts/optimized/responsePrompt";
import { normalizeFinalResponse } from "../util/responseCleaner";
import { formatForPrompt } from "../prompts/promptUtils";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { invokeModelWithLogging } from "./ModelInvokeLogger";

export async function runOptimizedResponseChain({
  userQuery,
  toolResults,
  analysisResult,
  memoryContext,
  model
}: {
  userQuery: string;
  toolResults: Array<{ tool: string; result: any }>;
  analysisResult: any;
  memoryContext?: string;
  model: BaseChatModel;
}) {
  // Formatear los parámetros para el prompt centralizado
  const promptInput = {
    userQuery,
    toolResults: formatForPrompt(toolResults || []),
    analysisResult: formatForPrompt(analysisResult),
    memoryContext: memoryContext || ''
  };

  // Encadenar: prompt centralizado -> modelo -> parser centralizado
  const chain = responsePromptLC.pipe(model).pipe(responseOutputParser);
  const rawResult = await invokeModelWithLogging(chain, promptInput, { caller: 'runOptimizedResponseChain' });
  // Normalizar siempre la salida final para la UI
  return normalizeFinalResponse(
    typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult)
  );
}
