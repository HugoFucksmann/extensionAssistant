import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { JsonOutputParser } from '@langchain/core/output_parsers';

// Esquema para la salida de la reflexión
export const reflectionOutputSchema = z.object({
  improvements: z.array(z.string()).describe("Posibles mejoras a la solución"),
  alternativeApproaches: z.array(z.string()).describe("Enfoques alternativos considerados"),
  confidenceChange: z.number().min(-1).max(1).describe("Cambio en el nivel de confianza"),
  knowledgeGaps: z.array(z.string()).describe("Lagunas de conocimiento identificadas")
});

export type ReflectionOutput = z.infer<typeof reflectionOutputSchema>;

// Parser para la salida de la reflexión
export const reflectionParser = new JsonOutputParser<ReflectionOutput>();

// Plantilla de prompt para la reflexión
export const reflectionPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Eres un asistente experto en reflexión crítica. 
    Analiza la solución propuesta e identifica áreas de mejora.`
  ],
  [
    'human',
    `Consulta original: {userQuery}
    \nAnálisis inicial: {analysis}
    \nSolución propuesta: {proposedSolution}
    \nPor favor, reflexiona sobre esta solución.`
  ]
]);

// Función para formatear el prompt de reflexión
export function formatReflectionPrompt(
  userQuery: string,
  analysis: Record<string, any>,
  proposedSolution: string
) {
  return reflectionPrompt.format({
    userQuery,
    analysis: JSON.stringify(analysis, null, 2),
    proposedSolution,
    format_instructions: reflectionParser.getFormatInstructions()
  });
}
