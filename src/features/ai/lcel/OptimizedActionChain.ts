// src/features/ai/lcel/OptimizedActionChain.ts
import { actionPromptLC, actionOutputSchema } from "../prompts/optimized/actionPrompt";
import { formatForPrompt } from "../prompts/promptUtils";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createAutoCorrectStep } from "@shared/utils/aiResponseParser";
import { invokeModelWithLogging } from "./ModelInvokeLogger";

export async function runOptimizedActionChain({
  userQuery,
  lastToolName,
  lastToolResult,
  previousActions,
  memoryContext,
  model
}: {
  userQuery: string;
  lastToolName: string;
  lastToolResult: any;
  previousActions?: Array<{ tool: string; result: any }>;
  memoryContext?: string;
  model: BaseChatModel;
}) {

  const promptInput = {
    userQuery,
    lastToolName,
    lastToolResult: formatForPrompt(lastToolResult),
    previousActions: formatForPrompt(previousActions || []),
    memoryContext: memoryContext || ''
  };


  const chain = actionPromptLC.pipe(model).pipe((response: any) => {
    if (response && typeof response === 'object' && 'content' in response) {
      return response.content;
    }
    return response;
  }).pipe(createAutoCorrectStep(actionOutputSchema, model, {
    maxAttempts: 2,
    verbose: process.env.NODE_ENV === 'development'
  }));

  const result = await invokeModelWithLogging(chain, promptInput, {
    caller: 'runOptimizedActionChain'
  });

  return result;
}