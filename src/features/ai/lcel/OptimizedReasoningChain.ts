// src/features/ai/lcel/OptimizedReasoningChain.ts
import { reasoningPromptLC, reasoningOutputSchema } from "../prompts/optimized/reasoningPrompt";
import { formatForPrompt } from "../prompts/promptUtils";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createAutoCorrectStep } from "@shared/utils/aiResponseParser";
import { invokeModelWithLogging } from "./ModelInvokeLogger"; // <--- IMPORTACIÓN ESTÁTICA

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

  // const { invokeModelWithLogging } = await import('./ModelInvokeLogger'); // <--- LÍNEA ELIMINADA

  // Extraer el contenido del AIMessage antes de parsear
  const chain = reasoningPromptLC.pipe(model).pipe((response: any) => {
    if (response && typeof response === 'object' && 'content' in response) {
      return response.content;
    }
    return response;
  }).pipe(createAutoCorrectStep(reasoningOutputSchema, model, {
    maxAttempts: 2,
    verbose: process.env.NODE_ENV === 'development'
  }));

  const result = await invokeModelWithLogging(chain, promptInput, { // <--- USO DIRECTO
    caller: 'runOptimizedReasoningChain'
  });

  return result;
}