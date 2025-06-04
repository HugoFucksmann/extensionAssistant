/**
 * Prompt optimizado para la fase de razonamiento
 * Diseñado para tomar decisiones sobre qué herramientas usar y cómo proceder
 */

import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonMarkdownStructuredOutputParser } from "langchain/output_parsers";


export const reasoningOutputSchema = z.object({
  reasoning: z.string().describe('Razonamiento detallado sobre cómo resolver la tarea'),
  nextAction: z.enum(['use_tool', 'respond']).describe('Acción a realizar'),
  tool: z.string().nullable().optional().describe('Nombre de la herramienta a usar si nextAction es "use_tool", de lo contrario null.'),
  parameters: z.record(z.any()).nullable().optional().describe('Parámetros para la herramienta si nextAction es "use_tool", de lo contrario null.'),
  response: z.string().nullable().optional().describe('Respuesta para el usuario si nextAction es "respond", de lo contrario null.')
});

// Tipo para la salida del razonamiento
export type ReasoningOutput = z.infer<typeof reasoningOutputSchema>;

/**
 * Prompt LangChain para la fase de razonamiento
 */
export const reasoningPromptLC = ChatPromptTemplate.fromMessages([
  ["system", `Eres un asistente de IA experto en programación. Tu tarea es decidir el siguiente paso: usar una herramienta o responder directamente al usuario.

Responde ÚNICAMENTE con un objeto JSON válido que se adhiera estrictamente al esquema definido.
No incluyas texto explicativo, markdown ni nada fuera del objeto JSON.

INSTRUCCIONES:
1. Devuelve solo el JSON.
2. nextAction: Usa solo 'use_tool' o 'respond'.
3. tool y parameters: Si nextAction = 'use_tool', proporciona ambos usando la DESCRIPCIÓN DE HERRAMIENTAS. Asegúrate de que el nombre de la herramienta sea exacto.
4. response: Si nextAction = 'respond', completa ese campo con la respuesta para el usuario.
5. reasoning: Explica brevemente el razonamiento detrás de la decisión.

DESCRIPCIÓN DE HERRAMIENTAS (nombre, descripción, esquema de parámetros Zod):
{toolsDescription}

ESQUEMA JSON ESPERADO:
{{ // MODIFICADO: Doble llave para escapar
  "reasoning": "string",
  "nextAction": "use_tool", // o "respond"
  "tool": "string | null",
  "parameters": "object | null",
  "response": "string | null"
}}
`],
  ["user", `Consulta del Usuario: "{userQuery}"

Análisis Previo:
{analysisResult}

Resultados de Herramientas Anteriores (si los hay, puede estar vacío):
{previousToolResults}

Memoria Relevante (si aplica):
{memoryContext}
`]
]);


// OutputParser basado en Zod y LangChain
export const reasoningOutputParser = new JsonMarkdownStructuredOutputParser(reasoningOutputSchema);