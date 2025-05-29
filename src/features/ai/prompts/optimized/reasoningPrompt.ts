/**
 * Prompt optimizado para la fase de razonamiento
 * Diseñado para tomar decisiones sobre qué herramientas usar y cómo proceder
 */

import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonMarkdownStructuredOutputParser } from "langchain/output_parsers";

// Esquema para validar la salida del modelo
export const reasoningOutputSchema = z.object({
  // Pensamiento paso a paso sobre cómo abordar el problema
  reasoning: z.string().describe('Razonamiento detallado sobre cómo resolver la tarea'),
  
  // Acción a tomar (usar una herramienta o generar respuesta)
  action: z.enum(['use_tool', 'respond']).describe('Acción a realizar'),
  
  // Herramienta a utilizar (si action es 'use_tool')
  tool: z.string().optional().describe('Nombre de la herramienta a utilizar'),
  
  // Parámetros para la herramienta (si action es 'use_tool')
  parameters: z.record(z.any()).optional().describe('Parámetros para la herramienta'),
  
  // Respuesta final (si action es 'respond')
  response: z.string().optional().describe('Respuesta final para el usuario')
});

// Tipo para la salida del razonamiento
export type ReasoningOutput = z.infer<typeof reasoningOutputSchema>;

/**
 * Prompt LangChain para la fase de razonamiento
 * Usa variables: 
 */
// Versión simplificada para depuración
export const reasoningPromptLC = ChatPromptTemplate.fromMessages([
  ["system", "Eres un asistente de programación. Debes decidir si usar una herramienta o responder directamente, y responder SOLO con un JSON válido que cumpla exactamente con el esquema proporcionado. No incluyas texto adicional, explicaciones ni bloques de código markdown. Devuelve únicamente el objeto JSON."],
  ["user", "Decide si usar una herramienta o responder directamente."]
]);

// OutputParser basado en Zod y LangChain
export const reasoningOutputParser = new JsonMarkdownStructuredOutputParser(reasoningOutputSchema);

/**
 * Ejemplo de uso:
 * const result = await reasoningPromptLC.pipe(llm).pipe(reasoningOutputParser).invoke({
 *   userQuery, analysisResult, toolsDescription, previousToolResults, memoryContext
 * });
 */
