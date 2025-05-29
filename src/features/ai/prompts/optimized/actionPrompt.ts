/**
 * Prompt optimizado para la fase de acción
 * Diseñado para interpretar los resultados de las herramientas y decidir el siguiente paso
 */

import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonMarkdownStructuredOutputParser } from "langchain/output_parsers";

// Esquema para validar la salida del modelo
export const actionOutputSchema = z.object({
  // Interpretación del resultado de la herramienta
  interpretation: z.string().describe('Interpretación del resultado de la herramienta'),
  
  // Siguiente acción a tomar (simplificado a solo use_tool y respond)
  nextAction: z.enum(['use_tool', 'respond']).describe('Siguiente acción a realizar'),
  
  // Herramienta a utilizar (si nextAction es 'use_tool')
  tool: z.string().optional().describe('Nombre de la herramienta a utilizar'),
  
  // Parámetros para la herramienta (si nextAction es 'use_tool')
  parameters: z.record(z.any()).optional().describe('Parámetros para la herramienta'),
  
  // Respuesta final (si nextAction es 'respond')
  response: z.string().optional().describe('Respuesta final para el usuario')
});

// Tipo para la salida de la acción
export type ActionOutput = z.infer<typeof actionOutputSchema>;

/**
 * Prompt LangChain para la fase de acción
 * Usa variables: userQuery, lastToolName, lastToolResult, previousActions, memoryContext
 */
// Desactivado temporalmente para depuración
// export const actionPromptLC = ChatPromptTemplate.fromMessages([
//   [
//     "system",
//     "Eres un asistente de programación experto que interpreta resultados de herramientas y decide los siguientes pasos."
//   ],
//   [
//     "user",
//     [
//       "{{#if memoryContext}}MEMORIA RELEVANTE:\n{{memoryContext}}\n\n{{/if}}",
//       "{{#if previousActions}}ACCIONES PREVIAS:\n{{previousActions}}\n\n{{/if}}",
//       "RESULTADO DE LA ÚLTIMA HERRAMIENTA ({{lastToolName}}):\n{{lastToolResult}}\n",
//       "Basándote en la consulta del usuario: \"{{userQuery}}\" y el resultado de la herramienta {{lastToolName}}, decide cuál debe ser el siguiente paso.",
//       "Responde SOLO con un objeto JSON con la siguiente estructura:",
//       "{",
//       "  \"interpretation\": \"Tu interpretación del resultado de la herramienta\",",
//       "  \"nextAction\": \"use_tool o respond\",",
//       "  \"tool\": \"nombre_de_la_herramienta (solo si nextAction es use_tool)\",",
//       "  \"parameters\": { ... parámetros para la herramienta ... } (solo si nextAction es use_tool),",
//       "  \"response\": \"Respuesta final para el usuario (solo si nextAction es respond)\"",
//       "}"
//     ].join("\n")
//   ]
// ]);

// Versión simplificada para depuración
export const actionPromptLC = ChatPromptTemplate.fromMessages([
  ["system", "Eres un asistente de programación. Debes interpretar el resultado y decidir el siguiente paso, respondiendo SOLO con un JSON válido que cumpla exactamente con el esquema proporcionado. No incluyas texto adicional, explicaciones ni bloques de código markdown. Devuelve únicamente el objeto JSON."],
  ["user", "Interpreta el resultado y decide el siguiente paso."]
]);

// OutputParser basado en Zod y LangChain
export const actionOutputParser = new JsonMarkdownStructuredOutputParser(actionOutputSchema);

/**
 * Ejemplo de uso:
 * const result = await actionPromptLC.pipe(llm).pipe(actionOutputParser).invoke({
 *   userQuery, lastToolName, lastToolResult, previousActions, memoryContext
 * });
 */
