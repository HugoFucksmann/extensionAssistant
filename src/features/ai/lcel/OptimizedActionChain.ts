import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { actionOutputSchema } from "../prompts/optimized/actionPrompt";
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


  // Advertencia y ejemplos para nextAction
  const strictInstructions = `IMPORTANTE: El campo nextAction SOLO puede ser uno de estos dos valores exactamente: "use_tool" o "respond". No uses frases, comandos, ni ninguna otra palabra.\n\nEjemplo válido:\n{\n  "interpretation": "El usuario quiere obtener un resumen.",\n  "nextAction": "use_tool",\n  "tool": "summarize",\n  "parameters": { "text": "..." },\n  "response": ""\n}\nEjemplo inválido (NO HACER):\n{\n  "interpretation": "El usuario quiere un resumen.",\n  "nextAction": "Resumir el contenido del archivo README.md.",\n  "tool": "summarize",\n  "parameters": { "text": "..." },\n  "response": ""\n}`;

  // Descripción de herramientas (puedes mejorar la interpolación si tienes el registro de herramientas)
  const toolsDescription = `Herramientas disponibles: getProjectSummary, searchInWorkspace, getActiveEditorInfo, writeToFile, getDocumentDiagnostics, getFileContents, createFileOrDirectory, deletePath, getGitStatus, runInTerminal`;

  // Construcción del prompt robusto
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `Eres un asistente de IA experto en programación. Tu tarea es decidir el siguiente paso: usar una herramienta o responder directamente al usuario.\nResponde ÚNICAMENTE con un objeto JSON válido que se adhiera estrictamente al esquema definido. No incluyas NINGÚN texto explicativo, markdown, ni nada fuera del objeto JSON.\n\n${strictInstructions}`],
    ["user", `CONTEXTO ACTUAL:\nConsulta del Usuario: "${userQuery}"\n\n${context}\n${toolsDescription}\n\nTAREA:\nBasado en el contexto, decide el siguiente paso y genera el JSON correspondiente.\n\nESQUEMA ESPERADO (campos principales):\n{\n  "interpretation": "string",\n  "nextAction": "use_tool" | "respond",\n  "tool": "string (Opcional, si nextAction='use_tool')",\n  "parameters": "object (Opcional, si nextAction='use_tool')",\n  "response": "string (Opcional, si nextAction='respond')"\n}`]
  ]);

  // Output parser basado en Zod
  const parser = StructuredOutputParser.fromZodSchema(actionOutputSchema);

  // Encadenar: prompt -> modelo -> parser
  const chain = prompt.pipe(model).pipe(parser);
  return await invokeModelWithLogging(chain, {}, { caller: 'runOptimizedActionChain' });
}
