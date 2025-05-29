// src/features/ai/prompts/optimized/actionPrompt.ts
import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonMarkdownStructuredOutputParser } from "langchain/output_parsers";

// Esquema para validar la salida del modelo
export const actionOutputSchema = z.object({
  // Interpretación del resultado de la herramienta
  interpretation: z.string().describe('Interpretación del resultado de la herramienta'),
  
  // Siguiente acción a tomar (simplificado a solo use_tool y respond)
  nextAction: z.enum(['use_tool', 'respond']).describe('Siguiente acción a realizar'),
  
  // Herramienta a utilizar (si nextAction es 'use_tool')
  tool: z.string().optional().describe('Nombre de la herramienta a utilizar'),
  
  // Parámetros para la herramienta (si nextAction es 'use_tool')
  parameters: z.record(z.any()).optional().describe('Parámetros para la herramienta'),
  
  // Respuesta final (si nextAction es 'respond')
  response: z.string().optional().describe('Respuesta final para el usuario')
});

// Tipo para la salida de la acción
export type ActionOutput = z.infer<typeof actionOutputSchema>;

// Versión simplificada para depuración
export const actionPromptLC = ChatPromptTemplate.fromMessages([
  ["system", "Eres un asistente de programación. Debes interpretar el resultado y decidir el siguiente paso, respondiendo SOLO con un JSON válido que cumpla exactamente con el esquema proporcionado. No incluyas texto adicional, explicaciones ni bloques de código markdown. Devuelve únicamente el objeto JSON."],
  ["user", "Interpreta el resultado y decide el siguiente paso."]
]);

// OutputParser basado en Zod y LangChain
export const actionOutputParser = new JsonMarkdownStructuredOutputParser(actionOutputSchema);

