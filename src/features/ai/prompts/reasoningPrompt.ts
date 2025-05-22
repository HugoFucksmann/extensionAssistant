import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { JsonOutputParser } from '@langchain/core/output_parsers';

// Esquema para la salida del razonamiento
export const reasoningOutputSchema = z.object({
  thoughtProcess: z.array(z.string()).describe("Pasos del proceso de pensamiento"),
  assumptions: z.array(z.string()).describe("Supuestos realizados"),
  confidence: z.number().min(0).max(1).describe("Nivel de confianza en la respuesta"),
  potentialIssues: z.array(z.string()).describe("Posibles problemas o limitaciones")
});

export type ReasoningOutput = z.infer<typeof reasoningOutputSchema>;

// Parser para la salida del razonamiento
export const reasoningParser = new JsonOutputParser<ReasoningOutput>();

// Plantilla de prompt para el razonamiento
export const reasoningPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Eres un asistente experto en razonamiento paso a paso. 
    Analiza la consulta y genera un razonamiento detallado.`
  ],
  ['human', 'Consulta: {userQuery}\n\nAnálisis previo: {analysis}'],
  ['ai', 'Voy a razonar paso a paso sobre esta consulta.']
]);

// Función para formatear el prompt de razonamiento
export function formatReasoningPrompt(userQuery: string, analysis: Record<string, any>) {
  return reasoningPrompt.format({
    userQuery,
    analysis: JSON.stringify(analysis, null, 2),
    format_instructions: reasoningParser.getFormatInstructions()
  });
}
