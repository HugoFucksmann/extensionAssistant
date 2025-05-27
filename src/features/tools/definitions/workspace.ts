// src/features/tools/definitions/workspace.ts
// import * as vscode from 'vscode'; // NO MÁS
// import * as fs from 'fs'; // Intentar usar vscode.workspace.fs si es posible, o mantener para cosas muy específicas
// import * as path from 'path'; // path es genérico, puede mantenerse
import { ToolDefinition, ToolExecutionContext, ToolPermission } from '../types';
import * as path from 'path'; // path es un módulo de Node, está bien importarlo directamente

export const getProjectInfo: ToolDefinition = {
  name: 'getProjectInfo',
  description: 'Gets project information including package.json, git info, and file statistics',
  parameters: {},
  requiredPermissions: ['workspace.info.read'], // AÑADIDO
  async execute(params: {}, context?: ToolExecutionContext) { // params y context añadidos
    if (!context?.vscodeAPI) { // COMPROBACIÓN CLAVE
      return { success: false, error: 'VSCode API context not available for getProjectInfo.' };
    }
    const vscodeInstance = context.vscodeAPI;
    // fs se usará de vscode.workspace.fs para consistencia
    const fs = vscodeInstance.workspace.fs;


    try {
      const workspaceFolders = vscodeInstance.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return { success: false, error: 'No workspace folders found' };
      }

      const rootFolder = workspaceFolders[0];
      const rootPath = rootFolder.uri.fsPath;
      const workspaceFolderPaths = workspaceFolders.map(folder => folder.uri.fsPath);

      let projectName = path.basename(rootPath);
      let packageJson: any = undefined;

      const packageJsonUri = vscodeInstance.Uri.joinPath(rootFolder.uri, 'package.json');
      try {
        // Leer con vscode.workspace.fs
        const packageJsonContentUint8 = await fs.readFile(packageJsonUri);
        const packageJsonContent = new TextDecoder().decode(packageJsonContentUint8);
        packageJson = JSON.parse(packageJsonContent);
        if (packageJson.name) {
          projectName = packageJson.name;
        }
      } catch (err) {
        // Si el archivo no existe (ENOENT) o hay error de parseo, es un warning, no un fallo de la herramienta
        if (err instanceof vscodeInstance.FileSystemError && err.code === 'FileNotFound') {
             console.warn(`[getProjectInfo] package.json not found at ${packageJsonUri.fsPath}`);
        } else {
             console.warn(`[getProjectInfo] Error reading or parsing package.json at ${packageJsonUri.fsPath}:`, err);
        }
      }

      const gitInfo: { hasGit: boolean; currentBranch?: string } = { hasGit: false };
      const gitUri = vscodeInstance.Uri.joinPath(rootFolder.uri, '.git');
      try {
        await fs.stat(gitUri); // Verificar si .git existe
        gitInfo.hasGit = true;

        const headUri = vscodeInstance.Uri.joinPath(gitUri, 'HEAD');
        try {
          const headContentUint8 = await fs.readFile(headUri);
          const headContent = new TextDecoder().decode(headContentUint8).trim();
          const match = headContent.match(/ref: refs\/heads\/(.+)/);
          if (match && match[1]) {
            gitInfo.currentBranch = match[1];
          }
        } catch (err) {
          console.warn('[getProjectInfo] Error reading .git/HEAD:', err);
        }
      } catch (err) {
         // .git no existe, no es un error, solo no hay git.
         if (err instanceof vscodeInstance.FileSystemError && err.code === 'FileNotFound') {
             // Silencioso, es normal que no haya .git
         } else {
             console.warn('[getProjectInfo] Error checking for .git directory:', err);
         }
      }

      const files = await vscodeInstance.workspace.findFiles('**/*', '**/node_modules/**');
      const fileStats = {
        totalFiles: files.length,
        byExtension: {} as Record<string, number>
      };

      for (const file of files) {
        const ext = path.extname(file.fsPath).toLowerCase();
        if (ext) {
          const extName = ext.slice(1);
          fileStats.byExtension[extName] = (fileStats.byExtension[extName] || 0) + 1;
        }
      }

      const projectInfo = {
        name: projectName,
        rootPath,
        workspaceFolders: workspaceFolderPaths,
        packageJson,
        gitInfo,
        fileStats
      };

      return { success: true, data: projectInfo };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};

export const searchWorkspace: ToolDefinition = {
  name: 'searchWorkspace',
  description: 'Search for text in workspace files',
  parameters: { /*...*/ },
  requiredPermissions: ['workspace.info.read'], // AÑADIDO
  async execute(params: { /*...*/ }, context?: ToolExecutionContext) { // context añadido
    if (!context?.vscodeAPI) { // COMPROBACIÓN CLAVE
      return { success: false, error: 'VSCode API context not available for searchWorkspace.' };
    }
    const vscodeInstance = context.vscodeAPI;

    try {
      const {
        query,
        includePattern = '**/*',
        excludePattern,
        maxResults = 100,
        isCaseSensitive = false,
        isRegExp = false,
        isWholeWord = false
      } = params as any; // Cast params for now, ensure types match later

      if (!query || typeof query !== 'string') {
        // Devolver ToolResult
        return { success: false, error: `Invalid query parameter: ${JSON.stringify(query)}. Expected a string.`};
      }

      const files = await vscodeInstance.workspace.findFiles(
        includePattern,
        excludePattern ? excludePattern : undefined, // findFiles espera undefined, no null
        maxResults // findFiles usa maxResults para el número de archivos, no de coincidencias de texto
      );

      const results: Array<{ /*...*/ }> = [];
      let resultCount = 0; // Este contador es para las coincidencias de texto

      for (const file of files) {
        if (resultCount >= maxResults) break; // Detenerse si se alcanza el maxResults de coincidencias

        try {
          const document = await vscodeInstance.workspace.openTextDocument(file);
          // ... (lógica de búsqueda existente, ya usa vscodeInstance indirectamente a través de document)
          const text = document.getText();
          let pattern = isRegExp ? query :
            query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (isWholeWord) {
            pattern = `\\b${pattern}\\b`;
          }
          const flags = isCaseSensitive ? 'g' : 'gi';
          const regex = new RegExp(pattern, flags);

          const lines = text.split('\n');
          for (let i = 0; i < lines.length && resultCount < maxResults; i++) {
            const line = lines[i];
            let match: RegExpExecArray | null;
            while ((match = regex.exec(line)) !== null && resultCount < maxResults) {
              results.push({
                uri: file.toString(),
                fileName: path.basename(file.fsPath),
                lineNumber: i + 1,
                lineText: line,
                matchText: match[0]
              });
              resultCount++;
              if (match.index === regex.lastIndex) {
                regex.lastIndex++;
              }
            }
          }
        } catch (error) {
          console.warn(`[searchWorkspace] Error processing file ${file.fsPath}:`, error);
        }
      }

      return { success: true, data: { results } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};