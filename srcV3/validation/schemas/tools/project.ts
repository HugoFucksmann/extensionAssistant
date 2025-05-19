// src/validation/schemas/tools/project.ts
import { z } from 'zod';
// Import types from tools if needed, but Zod schemas define the structure

// Schema para project.getPackageDependencies (input projectPath, output string[])
export const GetPackageDependenciesInputSchema = z.object({
  projectPath: z.string().min(1, "projectPath cannot be empty"),
});
export const GetPackageDependenciesOutputSchema = z.array(z.string());

// Schema para project.getProjectInfo (no params, output object)
export const GetProjectInfoInputSchema = z.object({}).optional().default({});
export const GetProjectInfoOutputSchema = z.object({
    mainLanguage: z.string(),
    secondaryLanguage: z.string().optional(),
    dependencies: z.array(z.string()),
});

// Schema para project.searchWorkspace (input query, output array of Locations - needs specific VS Code Location schema or simplified)
// VS Code Location structure is complex. Let's define a simplified Zod schema matching a *serializable* version.
const SimplifiedLocationSchema = z.object({
     uri: z.object({ // Simplify URI representation for serialization
          fsPath: z.string(), // File path
          // Add other uri components if needed, e.g., scheme
     }),
     range: z.object({
          start: z.object({ line: z.number(), character: z.number() }),
          end: z.object({ line: z.number(), character: z.number() }),
     }),
});
export const SearchWorkspaceInputSchema = z.object({
     query: z.string().min(1, "query cannot be empty"),
});
export const SearchWorkspaceOutputSchema = z.array(SimplifiedLocationSchema);