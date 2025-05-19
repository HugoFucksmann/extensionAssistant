// src/validation/schemas/tools/editor.ts
import { z } from 'zod';

// Schema para editor.getActiveEditorContent (no params, output object or null)
export const GetActiveEditorContentInputSchema = z.object({}).optional().default({});
export const GetActiveEditorContentOutputSchema = z.object({
  content: z.string(),
  languageId: z.string(),
  fileName: z.string(),
}).nullable(); // Tool returns null if no active editor