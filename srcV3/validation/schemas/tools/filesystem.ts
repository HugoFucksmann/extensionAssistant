// src/validation/schemas/tools/filesystem.ts
import { z } from 'zod';

// Schema para filesystem.getWorkspaceFiles (no params, output es string[])
export const GetWorkspaceFilesInputSchema = z.object({}).optional().default({});
export const GetWorkspaceFilesOutputSchema = z.array(z.string());

// Schema para filesystem.getFileContents (input filePath, output string)
export const GetFileContentsInputSchema = z.object({
  filePath: z.string().min(1, "filePath cannot be empty"),
});
 // Output can be the file content (string) or a specific error message/structure if not found
export const GetFileContentsOutputSchema = z.string(); // Assuming the tool function returns 'file not found' string on failure