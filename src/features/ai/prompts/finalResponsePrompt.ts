import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";

export const finalResponseSchema = z.object({
    response: z.string().describe("La respuesta final, completa y amigable para el usuario, en formato markdown."),
});

export type FinalResponse = z.infer<typeof finalResponseSchema>;

export const finalResponsePromptLC = ChatPromptTemplate.fromMessages([
    ["system", `Eres un asistente de IA servicial. Tu tarea es redactar una respuesta final y clara para el usuario.

INSTRUCCIONES:
1. Basa tu respuesta en la consulta original, el historial de conversación, los resultados de herramientas y la memoria de trabajo.
2. Formatea la respuesta en Markdown para una mejor legibilidad.
3. Responde ÚNICAMENTE con el objeto JSON especificado.

ESQUEMA JSON DE SALIDA:
{{
  "response": "string"
}}
`],
    ["user", `CONSULTA ORIGINAL: {userQuery}

HISTORIAL DE LA CONVERSACIÓN:
{chatHistory}

HISTORIAL DE EJECUCIÓN DE HERRAMIENTAS:
{executionHistory}

MEMORIA DE TRABAJO ACTUAL:
{workingMemorySnapshot}
`]
]);