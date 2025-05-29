import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { responseOutputSchema } from "../prompts/optimized/responsePrompt";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

/**
 * Ejecuta la cadena LCEL para la fase de respuesta optimizada.
 * Recibe los parámetros necesarios y retorna el objeto parseado según responseOutputSchema.
 */
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
  // Simplificado para depuración
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

  // Simplificado para depuración
  const format = "Responde con un objeto JSON que contenga los campos: response, memoryItems";

  // Ejemplos simplificados para depuración
  const examples = "";

  // Construcción del ChatPromptTemplate simplificado
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemInstruction],
    ["user", `${task}\n\n${format}`]
  ]);

  // Output parser basado en Zod
  const parser = StructuredOutputParser.fromZodSchema(responseOutputSchema);

  // Encadenar: prompt -> modelo -> parser
  const chain = prompt.pipe(model).pipe(parser);
  return await chain.invoke({});
}
