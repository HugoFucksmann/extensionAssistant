// src/validation/schemas/models/fixCodeOutput.ts
import { z } from 'zod';
// Define schema for proposedChanges array
const ProposedChangeSchema = z.object({
     file: z.string().min(1, "File path is required in proposed change"),
     changes: z.string().min(1, "Changes content is required"), // Assuming simple string format like diff or snippet
     reason: z.string().optional(),
});

export const FixCodeOutputSchema = z.object({
  messageToUser: z.string(),
  proposedChanges: z.array(ProposedChangeSchema).optional().default([]), // Allow empty array
  error: z.string().optional(),
});