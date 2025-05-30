import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { responseOutputSchema } from "../prompts/optimized/responsePrompt";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { invokeModelWithLogging } from "./ModelInvokeLogger";

import { AIMessageChunk } from "@langchain/core/messages";


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
  
  const systemInstruction = 'Eres un asistente de programación.';

  let context = '';
  if (memoryContext) {
    context += `MEMORIA RELEVANTE:\n${memoryContext}\n\n`;
  }
  context += `ANÁLISIS INICIAL:\n${JSON.stringify(analysisResult, null, 2)}\n\n`;
  if (toolResults && toolResults.length > 0) {
    context += 'RESULTADOS DE HERRAMIENTAS:\n';
    toolResults.forEach(({ tool, result }) => {
      context += `## ${tool}\n${JSON.stringify(result, null, 2)}\n\n`;
    });
  }

  const task =
    `Basándote en la consulta del usuario: "${userQuery}" y la información recopilada, genera una respuesta clara y concisa. También identifica información importante que debería recordarse para futuras interacciones.`;

  
  const format = "Responde con un objeto JSON que contenga los campos: response, memoryItems";


  const examples = "";

 
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemInstruction],
    ["user", `${task}\n\n${format}`]
  ]);

 
  const parser = StructuredOutputParser.fromZodSchema(responseOutputSchema);

 
  const chain = prompt.pipe(model);
  const rawResponse = await invokeModelWithLogging(chain, {}, { caller: 'runOptimizedResponseChain' }) as AIMessageChunk;
 
  
  if (!rawResponse?.content) {
    throw new Error('La respuesta del modelo está vacía o es inválida');
  }

 
const content = Array.isArray(rawResponse.content) 
? rawResponse.content.map(c => 'text' in c ? c.text : JSON.stringify(c)).join('\n')
: rawResponse.content;
  
  
  return await parser.parse(content);
}
