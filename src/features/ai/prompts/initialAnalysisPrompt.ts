import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { JsonOutputParser } from '@langchain/core/output_parsers';

// Esquema para la salida del análisis inicial
export const analysisOutputSchema = z.object({
  objective: z.string().describe("El objetivo principal de la consulta del usuario"),
  requiredContext: z.array(z.string()).describe("Elementos de contexto necesarios para responder"),
  complexity: z.enum(['low', 'medium', 'high']).describe("Nivel de complejidad de la consulta"),
  requiresCodeAnalysis: z.boolean().describe("Si la consulta requiere analizar código"),
  suggestedTools: z.array(z.string()).describe("Herramientas sugeridas para resolver la consulta")
});

export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;

// Parser para la salida del análisis
export const analysisParser = new JsonOutputParser<AnalysisOutput>();

// Plantilla de prompt para el análisis inicial
export const initialAnalysisPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Eres un asistente experto en análisis de consultas técnicas. 
    Analiza la siguiente consulta del usuario y genera un análisis estructurado.`
  ],
  ['human', 'Consulta del usuario: {userQuery}'],
  ['ai', 'Por favor, realiza un análisis detallado de esta consulta.']
]);

// Función para formatear el prompt de análisis
export function formatAnalysisPrompt(userQuery: string) {
  return initialAnalysisPrompt.format({
    userQuery,
    format_instructions: analysisParser.getFormatInstructions()
  });
}
