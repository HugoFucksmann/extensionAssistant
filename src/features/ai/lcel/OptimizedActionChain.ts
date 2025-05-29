import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { actionOutputSchema } from "../prompts/optimized/actionPrompt";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

/**
 * Ejecuta la cadena LCEL para la fase de acción optimizada.
 * Recibe los parámetros necesarios y retorna el objeto parseado según actionOutputSchema.
 */
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
  const systemInstruction =
    'Eres un asistente de programación experto que interpreta resultados de herramientas y decide los siguientes pasos.';

  let context = '';
  if (memoryContext) {
    context += `MEMORIA RELEVANTE:\n${memoryContext}\n\n`;
  }
  if (previousActions && previousActions.length > 0) {
    context += 'ACCIONES PREVIAS:\n';
    previousActions.forEach(({ tool, result }) => {
      context += `## ${tool}\n${JSON.stringify(result, null, 2)}\n\n`;
    });
  }
  context += `RESULTADO DE LA ÚLTIMA HERRAMIENTA (${lastToolName}):\n${JSON.stringify(lastToolResult, null, 2)}\n`;

  const task =
    `Basándote en la consulta del usuario: "${userQuery}" y el resultado de la herramienta ${lastToolName}, decide cuál debe ser el siguiente paso.`;

  // Simplificado para depuración
  const format = "Responde con un objeto JSON que contenga los campos: interpretation, nextAction, tool, parameters, response";
    

  // Ejemplos simplificados para depuración
  const examples = "";

  // Construcción del ChatPromptTemplate simplificado
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "Eres un asistente que interpreta resultados."],
    ["user", `${task}\n\n${format}`]
  ]);

  // Output parser basado en Zod
  const parser = StructuredOutputParser.fromZodSchema(actionOutputSchema);

  // Encadenar: prompt -> modelo -> parser
  const chain = prompt.pipe(model).pipe(parser);
  return await chain.invoke({});
}
