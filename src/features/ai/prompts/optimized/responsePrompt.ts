// src/features/ai/prompts/optimized/responsePrompt.ts

import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonMarkdownStructuredOutputParser } from "langchain/output_parsers";

// Esquema para validar la salida del modelo
export const responseOutputSchema = z.object({
  // Respuesta final para el usuario
  response: z.string().describe('Respuesta final y completa para el usuario'),
});

// Tipo para la salida de la respuesta
export type ResponseOutput = z.infer<typeof responseOutputSchema>;

/**
 * Prompt LangChain para la fase de respuesta final
 */
export const responsePromptLC = ChatPromptTemplate.fromMessages([
  ["system", `Eres un asistente de IA experto en programación. Tu tarea es generar una respuesta final para el usuario y, opcionalmente, identificar elementos importantes para guardar en memoria a largo plazo.
    
    Análisis Inicial:
    {analysisResult}


    Resultados de Herramientas Utilizadas:
    {toolResults}

    TAREA:
    Genera la respuesta final para el usuario. Formato libre.
`],
["user", `CONTEXTO DE LA CONVERSACIÓN:
Consulta Original del Usuario: "{userQuery}"
`]
]);

// OutputParser basado en Zod y LangChain
export const responseOutputParser = new JsonMarkdownStructuredOutputParser(responseOutputSchema);