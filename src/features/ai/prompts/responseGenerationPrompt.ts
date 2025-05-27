import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { JsonOutputParser } from '@langchain/core/output_parsers';

// Esquema para la salida de la generación de respuesta
export const responseOutputSchema = z.object({
  response: z.string().describe("La respuesta final para el usuario")
});

export type ResponseOutput = z.infer<typeof responseOutputSchema>;

// Parser para la salida de la generación de respuesta
export const responseParser = new JsonOutputParser<ResponseOutput>();

// Plantilla de prompt para la generación de respuesta
export const responseGenerationPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Eres un asistente experto en generar respuestas claras y útiles.
    Genera una respuesta final para el usuario basada en el objetivo y el historial de la conversación.
    Tu respuesta debe ser directa y resolver el objetivo planteado.`
  ],
  [
    'human',
    `Objetivo: {objective}
    \nHistorial de la conversación: {history}
    \nPor favor, genera una respuesta final clara y útil.`
  ]
]);

// Función para formatear el prompt de generación de respuesta
export function formatResponseGenerationPrompt(
  objective: string,
  history: string
) {
  return responseGenerationPrompt.format({
    objective,
    history,
    format_instructions: responseParser.getFormatInstructions()
  });
}
