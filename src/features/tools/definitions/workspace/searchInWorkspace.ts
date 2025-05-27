// src/features/tools/definitions/workspace/searchInWorkspace.ts
import * as vscode from 'vscode';
import { ToolDefinition, ToolPermission, ToolResult, ToolExecutionContext } from '../../types';

export const searchInWorkspace: ToolDefinition = {
  name: 'searchInWorkspace',
  description: 'Searches for a text query or regular expression in workspace files. Respects .gitignore and files.exclude settings. Returns file paths and line numbers of matches.',
  parameters: {
    query: { type: 'string', description: 'The text or regex pattern to search for.', required: true },
    isRegex: { type: 'boolean', description: 'Set to true if the query is a regular expression.', default: false, required: false },
    // filePattern: { type: 'string', description: 'Optional glob pattern for files to include (e.g., "*.ts"). Defaults to all relevant files.', required: false }, // Omitido por simplicidad
    maxResultsPerFile: { type: 'number', description: 'Maximum results to return per file.', default: 10, required: false },
    maxTotalResults: { type: 'number', description: 'Maximum total results to return across all files.', default: 100, required: false }
  },
  requiredPermissions: ['workspace.info.read'], // No necesita filesystem.read si usa la API de búsqueda de VS Code
  async execute(
    params: { query: string; isRegex?: boolean; filePattern?: string; maxResultsPerFile?: number; maxTotalResults?: number },
    context?: ToolExecutionContext
  ): Promise<ToolResult<any>> {
    if (!context?.vscodeAPI) {
      return { success: false, error: 'VSCode API context not available.' };
    }

    const { 
      query, 
      isRegex = false, 
      // filePattern, // Si se decide añadir, usarlo en TextSearchQuery
      maxResultsPerFile = 10,
      maxTotalResults = 100 
    } = params;

    if (!context.vscodeAPI.workspace.workspaceFolders || context.vscodeAPI.workspace.workspaceFolders.length === 0) {
        return { success: false, error: "No workspace folder open to search in." };
    }
    
   /*  const searchOptions: vscode.TextSearchOptions = {
      maxResults: maxResultsPerFile, // Este es por archivo para findTextInFiles
      // Podríamos añadir include/exclude patterns aquí si el LLM los necesitara
      // include: filePattern ? new vscode.RelativePattern(context.vscodeAPI.workspace.workspaceFolders[0], filePattern) : undefined,
    }; */

    const results: Array<{ filePath: string; line: number; character: number; length: number; preview: string }> = [];
    let totalResultsFound = 0;

    try {
      context?.dispatcher?.systemInfo(`Searching in workspace for: "${query}"`, { toolName: 'searchInWorkspace', query, isRegex, maxResultsPerFile, maxTotalResults }, context.chatId);

      // findTextInFiles itera sobre los resultados.
      // Necesitamos un proveedor de búsqueda de texto. VS Code tiene uno incorporado (ripgrep).
      // Esta API es un poco más compleja de usar directamente que un simple `findFiles`.
      // Una alternativa más simple sería:
      // 1. `findFiles` para obtener una lista de Uris (con `filePattern` si se proporciona).
      // 2. Leer cada archivo y buscar el texto manualmente.
      // Esto sería más lento pero más fácil de implementar sin depender de `vscode.workspace.findTextInFiles`
      // que requiere un `TextSearchProvider` o usar el comando `vscode.executeWorkspaceSymbolProvider`.
      //
      // Por simplicidad y para usar una API más directa, vamos a usar un enfoque manual:
      // findFiles -> readFile -> search in content.

      const files = await context.vscodeAPI.workspace.findFiles(
        params.filePattern || '**/*', // Usa el patrón o todos los archivos
        undefined, // exclude (ya maneja .gitignore y files.exclude)
        200 // Limitar el número de archivos a escanear para no tardar demasiado
      );

      const searchRegex = new RegExp(isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g' + (isRegex ? '' : 'i')); // 'i' para case-insensitive si no es regex

      for (const fileUri of files) {
        if (totalResultsFound >= maxTotalResults) break;

        try {
          const fileContentUint8Array = await context.vscodeAPI.workspace.fs.readFile(fileUri);
          const content = new TextDecoder().decode(fileContentUint8Array);
          const lines = content.split(/\r\n|\r|\n/);
          let matchesInFile = 0;

          for (let i = 0; i < lines.length; i++) {
            if (totalResultsFound >= maxTotalResults || matchesInFile >= maxResultsPerFile) break;
            
            let match;
            while ((match = searchRegex.exec(lines[i])) !== null) {
              if (totalResultsFound >= maxTotalResults || matchesInFile >= maxResultsPerFile) break;
              
              results.push({
                filePath: context.vscodeAPI.workspace.asRelativePath(fileUri, false),
                line: i + 1,
                character: match.index,
                length: match[0].length,
                preview: lines[i].trim()
              });
              totalResultsFound++;
              matchesInFile++;
              if (match.index === searchRegex.lastIndex) { // Evitar bucles infinitos con coincidencias de longitud cero
                searchRegex.lastIndex++;
              }
            }
          }
        } catch (readError) {
          // context?.dispatcher?.systemWarning(`Could not read file ${fileUri.fsPath} during search.`, { error: readError }, context.chatId);
          // Ignorar archivos que no se pueden leer (binarios, permisos, etc.)
        }
      }
      
      return { success: true, data: { query, results, totalFound: results.length } };

    } catch (error: any) {
      context?.dispatcher?.systemError('Error executing searchInWorkspace', error, 
        { toolName: 'searchInWorkspace', params, chatId: context.chatId }
      );
      return { success: false, error: `Failed to search in workspace: ${error.message}` };
    }
  }
};