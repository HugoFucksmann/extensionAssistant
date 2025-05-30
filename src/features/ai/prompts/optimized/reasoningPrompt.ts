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
  tool: z.string().nullable().describe('Nombre de la herramienta a utilizar o null si no aplica'),
  parameters: z.record(z.any()).nullable().describe('Parámetros para la herramienta o null si no aplica'),
  response: z.string().nullable().describe('Respuesta final para el usuario o null si no aplica')
});

// Tipo para la salida del razonamiento
export type ReasoningOutput = z.infer<typeof reasoningOutputSchema>;

/**
 * Prompt LangChain para la fase de razonamiento
 */
export const reasoningPromptLC = ChatPromptTemplate.fromMessages([
  ["system", `Eres un asistente de IA experto en programación. Tu tarea es decidir el siguiente paso: usar una herramienta o responder directamente al usuario.
Responde ÚNICAMENTE con un objeto JSON válido que se adhiera estrictamente al esquema definido.
No incluyas NINGÚN texto explicativo, markdown, ni nada fuera del objeto JSON.

CONSIGNA:
1.  **Salida JSON Pura**: Devuelve solo el JSON.
2.  **Acción**: Decide si 'use_tool' o 'respond'.
3.  **Herramienta**: Si 'use_tool', especifica 'tool' y 'parameters' según 'DESCRIPCIÓN DE HERRAMIENTAS'. Asegúrate de que los parámetros coincidan con los que requiere la herramienta.
4.  **Respuesta**: Si 'respond', proporciona el 'response'.`],
  ["user", `CONTEXTO ACTUAL:
Consulta del Usuario: "{userQuery}"

Análisis Previo:
{analysisResult}

Descripción de Herramientas Disponibles (nombre, descripción, esquema de parámetros Zod):
{toolsDescription}

Resultados de Herramientas Anteriores (si los hay, como string JSON):
{previousToolResults}

Memoria Relevante (si aplica):
{memoryContext}

TAREA:
Basado en el contexto, decide el siguiente paso y genera el JSON correspondiente.

ESQUEMA ESPERADO (campos principales):
{{
  "reasoning": "string",
  "nextAction": "use_tool", // o "respond", ningún otro valor es válido
  "tool": "string (Opcional, si nextAction='use_tool')",
  "parameters": "object (Opcional, si nextAction='use_tool')",
   "response": "string | null "
}}
`]
]);

// OutputParser basado en Zod y LangChain
export const reasoningOutputParser = new JsonMarkdownStructuredOutputParser(reasoningOutputSchema);