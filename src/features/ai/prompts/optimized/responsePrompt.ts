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
  [
    "system",
    `
Eres un asistente de IA experto en programación. Tu tarea es generar una respuesta final para el usuario basada en el análisis previo y los resultados de herramientas utilizadas.

INSTRUCCIONES:
1. Redacta una respuesta clara y útil para el usuario final.
2. Devuelve únicamente un objeto JSON válido con una sola propiedad: 'response'.
3. No incluyas explicaciones adicionales, markdown ni ningún texto fuera del objeto JSON.

ESQUEMA JSON ESPERADO:
{{ // MODIFICADO: Doble llave para escapar
  "response": "string"
}}

ANÁLISIS INICIAL:
{analysisResult}

RESULTADOS DE HERRAMIENTAS UTILIZADAS (puede estar vacío si no se usaron herramientas o se omitieron):
{toolResults}

MEMORIA RELEVANTE (si aplica):
{memoryContext}
`
  ],
  [
    "user",
    `
Consulta Original del Usuario: "{userQuery}"
Por favor, genera la respuesta final en el formato JSON especificado.
`
  ]
]);


// OutputParser basado en Zod y LangChain
export const responseOutputParser = new JsonMarkdownStructuredOutputParser(responseOutputSchema);