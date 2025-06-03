import { responsePromptLC } from "../prompts/optimized/responsePrompt";

import { responseOutputSchema } from "../prompts/optimized/responsePrompt";
import { formatForPrompt } from "../prompts/promptUtils";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { invokeModelWithLogging } from "./ModelInvokeLogger";
import { createAutoCorrectStep } from "@shared/utils/aiResponseParser";

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

  const promptInput = {
    userQuery,
    toolResults: formatForPrompt(toolResults || []),
    analysisResult: formatForPrompt(analysisResult),
    memoryContext: memoryContext || ''
  };


  const parseStep = createAutoCorrectStep(responseOutputSchema, model, {
    maxAttempts: 2,
    verbose: process.env.NODE_ENV === 'development',
  });


  const chain = responsePromptLC.pipe(model).pipe(parseStep);
  const result = await invokeModelWithLogging(chain, promptInput, { caller: 'runOptimizedResponseChain' });

  return result;

}
