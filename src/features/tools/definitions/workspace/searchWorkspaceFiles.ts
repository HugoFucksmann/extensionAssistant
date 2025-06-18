// src/features/tools/definitions/workspace/searchWorkspaceFiles.ts
import { z } from 'zod';
import { ToolDefinition, ToolResult } from '../../types';
import { searchFiles } from '../../../../shared/utils/pathUtils';
// AQUÍ ESTÁ LA LÍNEA QUE FALTABA: Importa la nueva utilidad
import { renameInputKey } from '../../../../shared/utils/zodUtils';

// Aplica z.preprocess para corregir el nombre del parámetro ANTES de la validación
export const searchWorkspaceFilesParamsSchema = z.preprocess(
    renameInputKey('pattern', 'query'), // Ahora TypeScript sabe qué es 'renameInputKey'
    z.object({
        query: z.string().min(1, { message: 'Search query cannot be empty.' }),
        maxResults: z.number().int().min(1).max(100).optional().default(20),
    })
);

// El resto del archivo no necesita cambios...
type SearchResultData = {
    files: {
        relativePath: string;
        absolutePath: string;
    }[];
};

export const searchWorkspaceFiles: ToolDefinition<
    typeof searchWorkspaceFilesParamsSchema,
    SearchResultData
> = {
    name: 'searchWorkspaceFiles',
    description: 'Searches the entire workspace for files matching a name or pattern. Useful for finding files like "auth.ts" or "userModel" when the exact path is unknown. Returns a list of matching file paths.',
    parametersSchema: searchWorkspaceFilesParamsSchema,
    uiFeedback: true,
    getUIDescription: (params) => `Searching for files matching "${params.query}"`,

    async execute(params, context): Promise<ToolResult<SearchResultData>> {
        const { query, maxResults } = params;
        try {
            const searchResults = await searchFiles(context.vscodeAPI, query, maxResults);
            const files = searchResults.map(result => ({
                relativePath: result.relativePath,
                absolutePath: result.uri.fsPath,
            }));

            return {
                success: true,
                data: { files },
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Error searching for files: ${error.message}`,
            };
        }
    },
};