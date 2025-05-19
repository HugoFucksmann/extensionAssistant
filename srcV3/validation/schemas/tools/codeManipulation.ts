// src/validation/schemas/tools/codeManipulation.ts
import { z } from 'zod';
// VS Code WorkspaceEdit structure is complex. Define a simplified Zod schema matching a *serializable* version.
const SimplifiedWorkspaceEditSchema = z.array(
    z.object({
        file: z.string().min(1, "File path is required"),
         // Assume changes are text replacements for simplicity
        changes: z.array(
            z.object({
                 range: z.object({
                     start: z.object({ line: z.number(), character: z.number() }),
                     end: z.object({ line: z.number(), character: z.number() }),
                 }),
                 newText: z.string(),
            })
        ),
    })
);

// Schema para codeManipulation.applyWorkspaceEdit (input edits array, output success/message object)
export const ApplyWorkspaceEditInputSchema = z.object({
     edits: SimplifiedWorkspaceEditSchema,
});
export const ApplyWorkspaceEditOutputSchema = z.object({
     success: z.boolean(),
     message: z.string(),
});