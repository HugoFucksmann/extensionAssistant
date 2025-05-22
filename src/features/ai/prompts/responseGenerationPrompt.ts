import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { JsonOutputParser } from '@langchain/core/output_parsers';

// Esquema para la salida de la generación de respuesta
export const responseOutputSchema = z.object({
  response: z.string().describe("La respuesta generada para el usuario"),
  followUpQuestions: z.array(z.string()).describe("Posibles preguntas de seguimiento"),
  sources: z.array(z.string()).describe("Fuentes utilizadas para generar la respuesta"),
  confidence: z.number().min(0).max(1).describe("Nivel de confianza en la respuesta")
});

export type ResponseOutput = z.infer<typeof responseOutputSchema>;

// Parser para la salida de la generación de respuesta
export const responseParser = new JsonOutputParser<ResponseOutput>();

// Plantilla de prompt para la generación de respuesta
export const responseGenerationPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Eres un asistente experto en generar respuestas claras y útiles.
    Genera una respuesta adecuada basada en el análisis y razonamiento proporcionados.`
  ],
  [
    'human',
    `Consulta del usuario: {userQuery}
    \nAnálisis: {analysis}
    \nRazonamiento: {reasoning}
    \nDatos adicionales: {additionalData || 'Ninguno'}
    \nPor favor, genera una respuesta clara y útil.`
  ]
]);

// Función para formatear el prompt de generación de respuesta
export function formatResponseGenerationPrompt(
  userQuery: string,
  analysis: Record<string, any>,
  reasoning: Record<string, any>,
  additionalData?: Record<string, any>
) {
  return responseGenerationPrompt.format({
    userQuery,
    analysis: JSON.stringify(analysis, null, 2),
    reasoning: JSON.stringify(reasoning, null, 2),
    additionalData: additionalData ? JSON.stringify(additionalData, null, 2) : '',
    format_instructions: responseParser.getFormatInstructions()
  });
}
