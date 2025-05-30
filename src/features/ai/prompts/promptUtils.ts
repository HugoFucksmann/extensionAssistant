import { z } from 'zod';
import { analysisOutputSchema } from './optimized/analysisPrompt';
import { reasoningOutputSchema } from './optimized/reasoningPrompt';
import { actionOutputSchema } from './optimized/actionPrompt';


export type ParserOutput = 
  | ReturnType<typeof analysisOutputSchema.parse>
  | ReturnType<typeof reasoningOutputSchema.parse>
  | ReturnType<typeof actionOutputSchema.parse>
  | Record<string, any>; // Para cualquier otro tipo de salida


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


export function formatForPrompt(obj: unknown): string { // <--- BUENO
  return typeof obj === 'string' ? obj : JSON.stringify(obj);
}

export function validateOutput<T>(output: unknown, schema: z.ZodSchema<T>): T { // <--- BUENO
  return schema.parse(output);
}

export function extractContent(message: unknown): string { 
  if (typeof message === 'string') return message;
  if (message && typeof message === 'object' && 'content' in message) { 
    return String((message as any).content);
  }
  return String(message);
}


export function extractMessageContent(message: unknown): string {
  if (typeof message === 'string') return message;
  if (message && typeof message === 'object' && 'content' in message) {
    return String((message as any).content);
  }
  return String(message);
}


export function createChatMessage(role: 'user' | 'assistant', content: string) {
  return { role, content };
}

export function processModelOutput(output: unknown): string {
  if (typeof output === 'string') return output;
  if (output && typeof output === 'object' && 'content' in output) {
    return String((output as any).content);
  }
  return JSON.stringify(output, null, 2);
}
