// src/validation/schemas/models/inputAnalysisResult.ts
import { z } from 'zod';

// Schema para la salida del prompt inputAnalyzer
export const InputAnalysisResultSchema = z.object({
  intent: z.union([z.literal('conversation'), z.literal('explainCode'), z.literal('fixCode'), z.literal('unknown')]),
  objective: z.string(),
  extractedEntities: z.object({
    filesMentioned: z.array(z.string()).optional().default([]),
    functionsMentioned: z.array(z.string()).optional().default([]),
    errorsMentioned: z.array(z.string()).optional().default([]),
    customKeywords: z.array(z.string()).optional().default([]),
    // Allow other properties
  }).passthrough(), // Use passthrough to allow extra fields not explicitly defined
  confidence: z.number().min(0).max(1),
  error: z.string().optional(),
  // Allow other properties
}).passthrough(); // Use passthrough to allow extra fields at the root level