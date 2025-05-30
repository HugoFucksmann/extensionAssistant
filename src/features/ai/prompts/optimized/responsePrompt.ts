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
 */
export const responsePromptLC = ChatPromptTemplate.fromMessages([
  ["system", `Eres un asistente de IA experto en programación. Tu tarea es generar una respuesta final para el usuario y, opcionalmente, identificar elementos importantes para guardar en memoria a largo plazo.
Responde ÚNICAMENTE con un objeto JSON válido que se adhiera estrictamente al esquema definido.
No incluyas NINGÚN texto explicativo, markdown, ni nada fuera del objeto JSON.

ESQUEMA ESPERADO (campos principales):
{{
  "response": "string",
  "memoryItems": "array (Opcional, [{{ type: 'context'|'codebase'|'user'|'tools', content: 'string', relevance: number (0-1) }}])"
}}

CONSIGNA:
1.  **Salida JSON Pura**: Devuelve solo el JSON.
2.  **Respuesta**: Formula una respuesta clara, concisa y útil para el usuario.
3.  **Memoria (Opcional)**: Si hay información crucial de la conversación actual que deba recordarse para el futuro (ej: decisiones clave, resúmenes importantes, hechos aprendidos), agrégala a 'memoryItems'. No guardes información trivial.`],
  ["user", `CONTEXTO DE LA CONVERSACIÓN:
Consulta Original del Usuario: "{userQuery}"

Análisis Inicial (como string JSON):
{analysisResult}

Resultados de Herramientas Utilizadas (si las hay, como string JSON):
{toolResults}

Memoria Relevante (si aplica):
{memoryContext}

TAREA:
Genera la respuesta final para el usuario y, si es relevante, los elementos de memoria. Produce el JSON correspondiente.`]
]);

// OutputParser basado en Zod y LangChain
export const responseOutputParser = new JsonMarkdownStructuredOutputParser(responseOutputSchema);