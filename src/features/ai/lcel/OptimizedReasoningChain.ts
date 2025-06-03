import { reasoningPromptLC, reasoningOutputParser } from "../prompts/optimized/reasoningPrompt";
import { formatForPrompt } from "../prompts/promptUtils";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

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

  const promptInput = {
    userQuery,
    analysisResult: formatForPrompt(analysisResult),
    toolsDescription,
    previousToolResults: formatForPrompt(previousToolResults || []),
    memoryContext: memoryContext || ''
  };


  const chain = reasoningPromptLC.pipe(model).pipe(reasoningOutputParser);
  const { invokeModelWithLogging } = await import('./ModelInvokeLogger');
  return await invokeModelWithLogging(chain, promptInput, { caller: 'runOptimizedReasoningChain' });
}
