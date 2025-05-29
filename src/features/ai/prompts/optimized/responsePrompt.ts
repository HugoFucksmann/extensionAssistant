// src/features/ai/prompts/optimized/responsePrompt.ts

import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonMarkdownStructuredOutputParser } from "langchain/output_parsers";

// Esquema para validar la salida del modelo
export const responseOutputSchema = z.object({
  // Respuesta final para el usuario
  response: z.string().describe('Respuesta final y completa para el usuario'),
  
  // Elementos de memoria a guardar (opcional)
  memoryItems: z.array(
    z.object({
      type: z.enum(['context', 'codebase', 'user', 'tools']).describe('Tipo de memoria'),
      content: z.string().describe('Contenido a recordar'),
      relevance: z.number().min(0).max(1).describe('Relevancia de 0 a 1')
    })
  ).optional().describe('Elementos a guardar en memoria')
});

// Tipo para la salida de la respuesta
export type ResponseOutput = z.infer<typeof responseOutputSchema>;

/**
 * Prompt LangChain para la fase de respuesta final
 * Usa variables: userQuery, toolResults, analysisResult, memoryContext
 */

// Versión simplificada para depuración
export const responsePromptLC = ChatPromptTemplate.fromMessages([
  ["system", "Eres un asistente de programación. Debes generar una respuesta basada en la información recopilada y responder SOLO con un JSON válido que cumpla exactamente con el esquema proporcionado. No incluyas texto adicional, explicaciones ni bloques de código markdown. Devuelve únicamente el objeto JSON."],
  ["user", "Genera una respuesta basada en la información recopilada."]
]);

// OutputParser basado en Zod y LangChain
export const responseOutputParser = new JsonMarkdownStructuredOutputParser(responseOutputSchema);
