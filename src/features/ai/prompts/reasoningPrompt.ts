import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { JsonOutputParser } from '@langchain/core/output_parsers';

// Esquema para la salida del razonamiento
export const reasoningOutputSchema = z.object({
  thought: z.string().describe("Proceso de pensamiento detallado"),
  action: z.object({
    toolName: z.string().optional().describe("Nombre de la herramienta a utilizar"),
    toolInput: z.any().optional().describe("Parámetros para la herramienta")
  }).optional().describe("Acción a realizar")
});

export type ReasoningOutput = z.infer<typeof reasoningOutputSchema>;

// Parser para la salida del razonamiento
export const reasoningParser = new JsonOutputParser<ReasoningOutput>();

// Variables requeridas por la plantilla de razonamiento
export const inputVariables = ['userQuery', 'analysis', 'format_instructions'];

// Plantilla de prompt para el razonamiento
export const reasoningPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Eres un asistente experto en razonamiento paso a paso. 
    Analiza la consulta del usuario y determina qué herramienta utilizar.
    
    Herramientas disponibles:
    {tools}
    
    Debes responder con un JSON que incluya:
    1. Un campo 'thought' con tu razonamiento detallado
    2. Un objeto 'action' con 'toolName' y 'toolInput' si decides usar una herramienta
    
    Si no necesitas usar una herramienta, omite el campo 'action' o establece 'toolName' como una cadena vacía.
    `
  ],
  ['human', 'Consulta del usuario: {userQuery}\n\nHistorial: {history}\n\nObjetivo: {objective}'],
  ['ai', 'Voy a razonar paso a paso sobre esta consulta y determinar qué acción tomar.']
]);

// Función para formatear el prompt de razonamiento
export function formatReasoningPrompt(userQuery: string, history: string, objective: string, tools: string) {
  return reasoningPrompt.format({
    userQuery,
    history,
    objective,
    tools,
    format_instructions: reasoningParser.getFormatInstructions()
  });
}
