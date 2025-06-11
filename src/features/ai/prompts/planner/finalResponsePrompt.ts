// src/features/ai/prompts/planner/finalResponsePrompt.ts
import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonMarkdownStructuredOutputParser } from "langchain/output_parsers";

// 3. FINAL RESPONSE - Común
export const finalResponseSchema = z.object({
    response: z.string().describe("La respuesta final, completa y bien formateada para el usuario.")
});

export type FinalResponseOutput = z.infer<typeof finalResponseSchema>;

export const finalResponsePrompt = ChatPromptTemplate.fromMessages([
    ["system", `Tu tarea es generar una respuesta final y cohesiva para el usuario, basada en su consulta original y todos los resultados de las herramientas que se ejecutaron.
La respuesta debe ser clara, útil y estar formateada en Markdown si es necesario.
Responde únicamente con un objeto JSON válido que se adhiera al esquema.

ESQUEMA JSON ESPERADO:
{{
  "response": "La respuesta completa y formateada para el usuario."
}}`],
    ["user", `CONSULTA ORIGINAL: "{userQuery}"
SECUENCIA DE RESULTADOS DE LA EJECUCIÓN:
{allResults}`]
]);

export const finalResponseParser = new JsonMarkdownStructuredOutputParser(finalResponseSchema);