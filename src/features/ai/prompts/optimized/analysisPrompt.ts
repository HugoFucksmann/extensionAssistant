/**
 * Prompt optimizado para la fase de análisis inicial
 * Diseñado para ser conciso y estructurado
 */

import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonMarkdownStructuredOutputParser } from "langchain/output_parsers";

// Esquema para validar la salida del modelo
export const analysisOutputSchema = z.object({
  understanding: z.string().describe('Comprensión clara de lo que pide el usuario'),
  taskType: z.enum([
    'code_explanation', 'code_generation', 'code_modification',
    'debugging', 'information_request', 'tool_execution'
  ]).describe('Categoría de la tarea solicitada'),
  requiredTools: z.array(z.string()).describe('Nombres de herramientas que podrían ser útiles de la lista de herramientas disponibles. Si no se necesita ninguna herramienta, devuelve un array vacío.'),
  requiredContext: z.array(z.string()).describe('Información adicional que el usuario podría necesitar proporcionar o que el sistema podría necesitar obtener para resolver la tarea (ej: "nombre del archivo", "confirmación para borrar"). Si no se necesita contexto adicional, devuelve un array vacío.'),
  initialPlan: z.array(z.string()).describe('Pasos iniciales concisos (1-3 pasos) para abordar la tarea. Sé breve.')
});

// Tipo para la salida del análisis
export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;

/**
 * Prompt LangChain para la fase de análisis inicial
 * Usa variables: userQuery, availableTools, codeContext, memoryContext
 */
// Versión simplificada para depuración
export const analysisPromptLC = ChatPromptTemplate.fromMessages([
  ["system", `Eres un asistente de programación. Debes analizar la consulta del usuario y responder SOLO con un JSON válido que cumpla exactamente con el esquema proporcionado. 

INSTRUCCIONES IMPORTANTES:
1. No incluyas texto adicional, explicaciones ni bloques de código markdown.
2. Devuelve ÚNICAMENTE el objeto JSON sin ningún texto alrededor.
3. Para el campo "taskType" DEBES usar uno de estos valores EXACTOS (no inventes ni traduzcas):
   - "code_explanation" (para explicar código)
   - "code_generation" (para generar código nuevo)
   - "code_modification" (para modificar código existente)
   - "debugging" (para depurar problemas)
   - "information_request" (para preguntas generales o de información)
   - "tool_execution" (para ejecutar herramientas específicas)

Si el usuario solo saluda o inicia una conversación, usa "information_request" como taskType.`],
  ["user", "Analiza la consulta del usuario."]
]);

// OutputParser basado en Zod y LangChain
export const analysisOutputParser = new JsonMarkdownStructuredOutputParser(analysisOutputSchema);

/**
 * Ejemplo de uso:
 * const result = await analysisPromptLC.pipe(llm).pipe(analysisOutputParser).invoke({
 *   userQuery, availableTools, codeContext, memoryContext
 * });
 */
