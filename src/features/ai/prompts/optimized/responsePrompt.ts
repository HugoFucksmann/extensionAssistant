// src/features/ai/prompts/optimized/responsePrompt.ts

import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonMarkdownStructuredOutputParser } from "langchain/output_parsers";

// Esquema para validar la salida del modelo
export const responseOutputSchema = z.object({
  // Respuesta final para el usuario
  response: z.string().describe('Respuesta final y completa para el usuario'),
  
  // Elementos de memoria a guardar (opcional)
/*   memoryItems: z.array(
    z.object({
      type: z.enum(['context', 'codebase', 'user', 'tools']).describe('Tipo de memoria'),
      content: z.string().describe('Contenido a recordar'),
      relevance: z.number().min(0).max(1).describe('Relevancia de 0 a 1')
    })
  ).optional().describe('Elementos a guardar en memoria') */
});

// Tipo para la salida de la respuesta
export type ResponseOutput = z.infer<typeof responseOutputSchema>;

/**
 * Prompt LangChain para la fase de respuesta final
 */
export const responsePromptLC = ChatPromptTemplate.fromMessages([
  ["system", `Eres un asistente de IA experto en programación. Tu tarea es generar una respuesta final para el usuario y, opcionalmente, identificar elementos importantes para guardar en memoria a largo plazo.

ESQUEMA ESPERADO (campos principales):
{{
  "response": "string"
}}

`],
["user", `CONTEXTO DE LA CONVERSACIÓN:
Consulta Original del Usuario: "{userQuery}"

Análisis Inicial (como string JSON):
{analysisResult}

Resultados de Herramientas Utilizadas (si las hay, como string JSON):
{toolResults}

TAREA:
Genera la respuesta final para el usuario.`]
]);

// OutputParser basado en Zod y LangChain
export const responseOutputParser = new JsonMarkdownStructuredOutputParser(responseOutputSchema);