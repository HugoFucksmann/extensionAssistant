import { z } from 'zod';
import { analysisOutputSchema } from './optimized/analysisPrompt';
import { reasoningOutputSchema } from './optimized/reasoningPrompt';
import { actionOutputSchema } from './optimized/actionPrompt';

/**
 * Tipos de salida de los parsers
 */
export type ParserOutput = 
  | ReturnType<typeof analysisOutputSchema.parse>
  | ReturnType<typeof reasoningOutputSchema.parse>
  | ReturnType<typeof actionOutputSchema.parse>
  | Record<string, any>; // Para cualquier otro tipo de salida

/**
 * Valida la salida de un parser contra su esquema correspondiente
 */
export function validateParserOutput<T>(
  output: unknown, 
  schema: z.ZodSchema<T>
): T {
  try {
    return schema.parse(output);
  } catch (error) {
    console.error('Error validando la salida del parser:', error);
    throw new Error(`Error de validación: ${error}`);
  }
}

/**
 * Combina múltiples mensajes en un solo prompt
 */
export function combineMessages(
  systemMessage: string,
  userMessage: string,
  previousMessages: Array<{role: 'user' | 'assistant', content: string}>
): Array<{role: 'system' | 'user' | 'assistant', content: string}> {
  return [
    { role: 'system', content: systemMessage },
    ...previousMessages,
    { role: 'user', content: userMessage }
  ];
}

/**
 * Formatea un objeto para mostrarlo en un prompt
 */
export function formatForPrompt(obj: unknown): string { // <--- BUENO
  return typeof obj === 'string' ? obj : JSON.stringify(obj);
}

export function validateOutput<T>(output: unknown, schema: z.ZodSchema<T>): T { // <--- BUENO
  return schema.parse(output);
}

export function extractContent(message: unknown): string { // <--- BUENO, pero el nombre podría ser más genérico si no siempre es 'content'
  if (typeof message === 'string') return message;
  if (message && typeof message === 'object' && 'content' in message) { // Asume que el campo es 'content'
    return String((message as any).content);
  }
  return String(message);
}

/**
 * Extrae el contenido de un mensaje de chat
 */
export function extractMessageContent(message: unknown): string {
  if (typeof message === 'string') return message;
  if (message && typeof message === 'object' && 'content' in message) {
    return String((message as any).content);
  }
  return String(message);
}

/**
 * Crea un objeto de mensaje para el chat
 */
export function createChatMessage(role: 'user' | 'assistant', content: string) {
  return { role, content };
}

/**
 * Procesa la salida de un modelo para extraer solo el contenido
 */
export function processModelOutput(output: unknown): string {
  if (typeof output === 'string') return output;
  if (output && typeof output === 'object' && 'content' in output) {
    return String((output as any).content);
  }
  return JSON.stringify(output, null, 2);
}
