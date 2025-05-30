import { actionPromptLC, actionOutputParser } from "../prompts/optimized/actionPrompt";
import { formatForPrompt } from "../prompts/promptUtils";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
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
  // Formatear los parámetros para el prompt centralizado
  const promptInput = {
    userQuery,
    lastToolName,
    lastToolResult: formatForPrompt(lastToolResult),
    previousActions: formatForPrompt(previousActions || []),
    memoryContext: memoryContext || ''
  };

  // Encadenar: prompt centralizado -> modelo -> parser centralizado
  const chain = actionPromptLC.pipe(model).pipe(actionOutputParser);
  return await invokeModelWithLogging(chain, promptInput, { caller: 'runOptimizedActionChain' });
}
