// src/validation/schemas/models/plannerResponse.ts
import { z } from 'zod';
// Import PromptType if needed for stricter typing, but Zod union handles it
// import { PromptType } from '../../../orchestrator/types';

// Schema para la salida del prompt planner
export const PlannerResponseSchema = z.object({
  action: z.union([z.literal('tool'), z.literal('prompt'), z.literal('respond')]),
  toolName: z.string().optional(), // Required if action is 'tool'
  promptType: z.string().optional(), // Required if action is 'prompt' - Use string as Zod union is complex here, validation will be conceptual
  params: z.record(z.any()).optional(), // Parameters for the tool/prompt, or { messageToUser: string } for respond
  storeAs: z.string().optional(), // Recommended for tool/prompt actions
  reasoning: z.string(),
  error: z.string().optional(),
  feedbackToUser: z.string().optional(),
  // Allow other properties
}).passthrough(); // Use passthrough to allow extra fields not explicitly defined