import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult } from '../../types';

export const findFilesByNameParamsSchema = z.object({
  query: z.string().min(1, { message: 'El nombre o patrón de archivo no puede estar vacío.' }),
  maxResults: z.number().min(1).max(100).optional().default(20),
});

export const findFilesByName: ToolDefinition<
  typeof findFilesByNameParamsSchema,
  { files: { relativePath: string; absolutePath: string }[] }
> = {
  uiFeedback: true,
  name: 'findFilesByName',
  description:
    'Busca archivos en el workspace cuyo nombre o patrón coincida con el query proporcionado. Útil para encontrar archivos por nombre, extensión o parte del nombre.',
  parametersSchema: findFilesByNameParamsSchema,
  async execute(params, context): Promise<ToolResult<{ files: { relativePath: string; absolutePath: string }[] }>> {
    const { query, maxResults } = params;
    try {
      const uris = await vscode.workspace.findFiles(`**/${query}`, '**/node_modules/**', maxResults);
      const files = uris.map(uri => ({
        relativePath: vscode.workspace.asRelativePath(uri, false),
        absolutePath: uri.fsPath,
      }));
      return {
        success: true,
        data: { files },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Error al buscar archivos: ${error.message}`,
        data: undefined,
      };
    }
  },
};
