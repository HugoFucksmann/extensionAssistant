// src/validation/schemas/models/explainCodeOutput.ts
import { z } from 'zod';

export const ExplainCodeOutputSchema = z.object({
  explanation: z.string(),
  relevantCodeSnippet: z.string().optional(),
  error: z.string().optional(),
});