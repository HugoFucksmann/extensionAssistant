
import { analysisOutputSchema } from './optimized/analysisPrompt';
import { reasoningOutputSchema } from './optimized/reasoningPrompt';
import { actionOutputSchema } from './optimized/actionPrompt';


export type ParserOutput =
  | ReturnType<typeof analysisOutputSchema.parse>
  | ReturnType<typeof reasoningOutputSchema.parse>
  | ReturnType<typeof actionOutputSchema.parse>
  | Record<string, any>;


export function formatForPrompt(obj: unknown): string {
  return typeof obj === 'string' ? obj : JSON.stringify(obj);
}
