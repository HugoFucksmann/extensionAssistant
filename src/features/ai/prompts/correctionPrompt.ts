import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { JsonOutputParser } from '@langchain/core/output_parsers';

// Esquema para la salida de la corrección
export const correctionOutputSchema = z.object({
  correctedSolution: z.string().describe("La solución corregida"),
  corrections: z.array(z.string()).describe("Lista de correcciones realizadas"),
  explanation: z.string().describe("Explicación de los cambios realizados"),
  confidence: z.number().min(0).max(1).describe("Nivel de confianza en la corrección")
});

export type CorrectionOutput = z.infer<typeof correctionOutputSchema>;

// Parser para la salida de la corrección
export const correctionParser = new JsonOutputParser<CorrectionOutput>();

// Plantilla de prompt para la corrección
export const correctionPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Eres un asistente experto en identificar y corregir errores en soluciones técnicas. 
    Analiza la solución propuesta y genera una versión corregida.`
  ],
  [
    'human',
    `Consulta original: {userQuery}
    \nAnálisis inicial: {analysis}
    \nSolución propuesta: {proposedSolution}
    \nProblemas identificados: {identifiedIssues}
    \nPor favor, proporciona una versión corregida de la solución.`
  ]
]);

// Función para formatear el prompt de corrección
export function formatCorrectionPrompt(
  userQuery: string,
  analysis: Record<string, any>,
  proposedSolution: string,
  identifiedIssues: string[]
) {
  return correctionPrompt.format({
    userQuery,
    analysis: JSON.stringify(analysis, null, 2),
    proposedSolution,
    identifiedIssues: identifiedIssues.join('\n- '),
    format_instructions: correctionParser.getFormatInstructions()
  });
}
