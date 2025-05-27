// src/features/tools/definitions/workspace/getProjectSummary.ts
import * as vscode from 'vscode';
import { ToolDefinition, ToolPermission, ToolResult, ToolExecutionContext } from '../../types';
import * as fs from 'fs/promises'; // Usar fs.promises para async/await
import * as path from 'path';

// Helper para leer y parsear JSON de forma segura
async function readJsonFileSafe(filePath: string, context?: ToolExecutionContext): Promise<any | undefined> {
  try {
    const content = await context!.vscodeAPI.workspace.fs.readFile(vscode.Uri.file(filePath));
    return JSON.parse(new TextDecoder().decode(content));
  } catch (error) {
    // context?.dispatcher?.systemWarning(`Failed to read or parse JSON file: ${filePath}`, { error }, context.chatId);
    return undefined;
  }
}

export const getProjectSummary: ToolDefinition = {
  name: 'getProjectSummary',
  description: 'Gets a summary of the current project: root path, project name (from package.json or folder name), primary language (heuristic based on file extensions), and basic workspace structure (top-level files/folders).',
  parameters: {}, // No parameters needed
  requiredPermissions: ['workspace.info.read', 'filesystem.read'], // filesystem.read para package.json y listado
  async execute(
    _params: {},
    context?: ToolExecutionContext
  ): Promise<ToolResult<any>> {
    if (!context?.vscodeAPI) {
      return { success: false, error: 'VSCode API context not available.' };
    }

    const workspaceFolders = context.vscodeAPI.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return { success: false, error: 'No workspace folder open.' };
    }

    const rootFolder = workspaceFolders[0]; // Simplificamos al primer workspace folder
    const rootPath = rootFolder.uri.fsPath;
    let projectName = path.basename(rootPath); // Default project name

    try {
      // 1. Project Name (from package.json or folder name)
      const packageJsonPath = path.join(rootPath, 'package.json');
      const packageJson = await readJsonFileSafe(packageJsonPath, context);
      if (packageJson?.name) {
        projectName = packageJson.name;
      }

      // 2. Top-level files and folders (simple listing, no recursion for summary)
      const topLevelEntries = await context.vscodeAPI.workspace.fs.readDirectory(rootFolder.uri);
      const structure = topLevelEntries.map(([name, type]) => ({
        name,
        type: type === context.vscodeAPI.FileType.Directory ? 'directory' : 
              type === context.vscodeAPI.FileType.File ? 'file' : 'other'
      })).slice(0, 20); // Limitar para que el resumen no sea enorme

      // 3. Primary Language (Heuristic based on file extensions in the root or common src folders)
      // Esta es una heurística simple. Una más avanzada podría analizar más profundamente.
      let languageCounts: Record<string, number> = {};
      const commonSourceDirs = ['', 'src', 'lib', 'app']; // directorios comunes a revisar
      let filesToScan: vscode.Uri[] = [];

      for (const dir of commonSourceDirs) {
        try {
          const dirUri = vscode.Uri.joinPath(rootFolder.uri, dir);
          const entries = await context.vscodeAPI.workspace.fs.readDirectory(dirUri);
          entries.forEach(([name, type]) => {
            if (type === context.vscodeAPI.FileType.File) {
              filesToScan.push(vscode.Uri.joinPath(dirUri, name));
            }
          });
        } catch (e) { /* Directorio no existe, ignorar */ }
      }
      
      // Si no se encontraron archivos en directorios comunes, escanear la raíz
      if (filesToScan.length === 0) {
         topLevelEntries.forEach(([name, type]) => {
            if (type === context.vscodeAPI.FileType.File) {
              filesToScan.push(vscode.Uri.joinPath(rootFolder.uri, name));
            }
          });
      }


      filesToScan.slice(0, 50).forEach(fileUri => { // Limitar el escaneo
        const ext = path.extname(fileUri.fsPath).toLowerCase();
        if (ext && ext.length > 1) {
          const lang = ext.substring(1);
          languageCounts[lang] = (languageCounts[lang] || 0) + 1;
        }
      });
      
      let primaryLanguage = 'unknown';
      if (Object.keys(languageCounts).length > 0) {
        primaryLanguage = Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0][0];
      }
      
      const summary = {
        projectName,
        rootPath,
        workspaceName: rootFolder.name,
        topLevelStructure: structure,
        detectedPrimaryLanguage: primaryLanguage,
        // packageJsonInfo: packageJson ? { name: packageJson.name, version: packageJson.version, dependencies: Object.keys(packageJson.dependencies || {}).length } : undefined,
      };
      
      // Podríamos añadir un resumen muy básico de Git aquí si no queremos un módulo 'git' separado aún.
      // Por ahora, lo mantenemos enfocado en el workspace.

      return { success: true, data: summary };

    } catch (error: any) {
      context?.dispatcher?.systemError('Error executing getProjectSummary', error, 
        { toolName: 'getProjectSummary', params: _params, chatId: context.chatId }
      );
      return { success: false, error: `Failed to get project summary: ${error.message}` };
    }
  }
};