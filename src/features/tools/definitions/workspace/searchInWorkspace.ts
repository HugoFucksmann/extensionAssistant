// src/features/tools/definitions/workspace/searchInWorkspace.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult, ToolExecutionContext, ToolPermission } from '../../types';

// Esquema Zod para los parámetros
export const searchInWorkspaceParamsSchema = z.object({
  query: z.string().min(1, { message: "Search query cannot be empty." }),
  isRegex: z.boolean().optional().default(false).describe("Set to true if the query is a regular expression."),
  // filePattern: z.string().optional().describe("Glob pattern for files to include (e.g., \"*.ts\"). Defaults to all relevant files."), // Omitido por simplicidad, LLM puede filtrar resultados si es necesario
  maxResultsPerFile: z.number().int().positive().optional().default(5).describe("Maximum results to return per file."),
  maxTotalResults: z.number().int().positive().optional().default(50).describe("Maximum total results to return across all files.")
}).strict();

// Tipos para la data retornada
type SearchMatch = {
  filePath: string; // Path relativo al workspace
  line: number; // 1-based
  character: number; // 0-based
  length: number;
  preview: string; // La línea donde se encontró la coincidencia
};
type SearchResultData = {
  query: string;
  results: SearchMatch[];
  totalFound: number;
  searchLimited: boolean; // Indica si se alcanzó maxTotalResults
};

export const searchInWorkspace: ToolDefinition<typeof searchInWorkspaceParamsSchema, SearchResultData> = {
  name: 'searchInWorkspace',
  description: 'Searches for a text query or regular expression in workspace files. Respects .gitignore and files.exclude settings. Returns file paths and line numbers of matches.',
  parametersSchema: searchInWorkspaceParamsSchema,
  requiredPermissions: ['workspace.info.read', 'filesystem.read'], // Necesita leer archivos para buscar contenido
  async execute(
    params,
    context
  ): Promise<ToolResult<SearchResultData>> {
    const {
      query,
      isRegex = false,
      maxResultsPerFile = 5,
      maxTotalResults = 50
    } = params;

    if (!context.vscodeAPI.workspace.workspaceFolders || context.vscodeAPI.workspace.workspaceFolders.length === 0) {
        return { success: false, error: "No workspace folder open to search in." };
    }
    
    const results: SearchMatch[] = [];
    let totalResultsFound = 0;
    let searchLimited = false;

    try {
      // Usar un patrón de búsqueda amplio, vscode.workspace.findFiles respeta .gitignore y files.exclude
      // Podríamos añadir un filePattern si el LLM lo necesitara, pero por ahora lo omitimos.
      const filesToSearch = await context.vscodeAPI.workspace.findFiles(
        '**/*', // Buscar en todos los archivos
        undefined, // exclude (ya maneja .gitignore y files.exclude por defecto)
        500 // Limitar el número de archivos a escanear inicialmente para no tardar demasiado
      );

      const searchRegex = new RegExp(
        isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), // Escapar si no es regex
        'g' + (isRegex ? '' : 'i') // 'g' para global, 'i' para case-insensitive si no es regex
      );

      for (const fileUri of filesToSearch) {
        if (totalResultsFound >= maxTotalResults) {
          searchLimited = true;
          break;
        }

        try {
          const fileContentUint8Array = await context.vscodeAPI.workspace.fs.readFile(fileUri);
          const content = new TextDecoder().decode(fileContentUint8Array);
          const lines = content.split(/\r\n|\r|\n/);
          let matchesInFile = 0;

          for (let i = 0; i < lines.length; i++) {
            if (totalResultsFound >= maxTotalResults || matchesInFile >= maxResultsPerFile) break;
            
            let match;
            // Resetear lastIndex para cada línea si la regex es global
            searchRegex.lastIndex = 0; 
            while ((match = searchRegex.exec(lines[i])) !== null) {
              if (totalResultsFound >= maxTotalResults || matchesInFile >= maxResultsPerFile) break;
              
              results.push({
                filePath: context.vscodeAPI.workspace.asRelativePath(fileUri, false),
                line: i + 1, // 1-based
                character: match.index, // 0-based
                length: match[0].length,
                preview: lines[i].trim()
              });
              totalResultsFound++;
              matchesInFile++;
              if (match.index === searchRegex.lastIndex && searchRegex.global) { // Evitar bucles infinitos con coincidencias de longitud cero en regex globales
                searchRegex.lastIndex++;
              }
              if (!searchRegex.global) break; // Si no es global, solo una coincidencia por línea
            }
          }
        } catch (readError) {
          // Ignorar archivos que no se pueden leer (binarios, permisos, etc.)
          // context.dispatcher.systemWarning(`Could not read file ${fileUri.fsPath} during search.`, { error: readError, toolName: 'searchInWorkspace' }, context.chatId);
        }
      }
      
      return { 
        success: true, 
        data: { 
          query, 
          results, 
          totalFound: results.length,
          searchLimited: searchLimited || (results.length >= maxTotalResults)
        } 
      };

    } catch (error: any) {
      return { success: false, error: `Failed to search in workspace: ${error.message}` };
    }
  }
};