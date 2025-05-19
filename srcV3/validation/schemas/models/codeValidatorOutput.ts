// src/validation/schemas/models/codeValidatorOutput.ts
import { z } from 'zod';

export const CodeValidatorOutputSchema = z.object({
  isValid: z.boolean(),
  feedback: z.string(),
  error: z.string().optional(),
});