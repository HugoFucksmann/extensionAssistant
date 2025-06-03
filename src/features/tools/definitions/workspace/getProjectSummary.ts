// src/features/tools/definitions/workspace/getProjectSummary.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult, } from '../../types';
import * as path from 'path';


export const getProjectSummaryParamsSchema = z.object({}).strict();


type TopLevelEntry = {
  name: string;
  type: 'file' | 'directory' | 'other';
};
type ProjectSummaryData = {
  projectName: string;
  rootPath: string;
  workspaceName: string;
  topLevelStructure: TopLevelEntry[];
  detectedPrimaryLanguage: string;
};

async function readJsonFileSafe(
  vscodeFs: typeof vscode.workspace.fs,
  fileUri: vscode.Uri,
): Promise<any | undefined> {
  try {
    const content = await vscodeFs.readFile(fileUri);
    return JSON.parse(new TextDecoder().decode(content));
  } catch (error) {
    return undefined;
  }
}

export const getProjectSummary: ToolDefinition<typeof getProjectSummaryParamsSchema, ProjectSummaryData | null> = {
  getUIDescription: () => 'Obtener resumen de proyecto.',
  uiFeedback: true,
  mapToOutput: (rawData, success, errorMsg) => success && rawData ? {
    title: 'Resumen de proyecto',
    summary: 'Resumen de proyecto obtenido correctamente.',
    details: `Nombre: ${rawData.projectName}\nPath: ${rawData.rootPath}\nLenguaje: ${rawData.detectedPrimaryLanguage}`,
    items: rawData.topLevelStructure,
    meta: {
      projectName: rawData.projectName,
      rootPath: rawData.rootPath,
      workspaceName: rawData.workspaceName,
      primaryLanguage: rawData.detectedPrimaryLanguage
    }
  } : {
    title: 'Error de resumen de proyecto',
    summary: `Error: ${errorMsg || 'No se pudo obtener el resumen.'}`,
    details: errorMsg,
    items: [],
    meta: {}
  },
  name: 'getProjectSummary',
  description: 'Gets a summary of the current VS Code workspace: root path, project name (from package.json or folder name), primary language (heuristic), and basic top-level file/folder structure. Returns null if no workspace is open.',
  parametersSchema: getProjectSummaryParamsSchema,
  async execute(
    _params,
    context
  ): Promise<ToolResult<ProjectSummaryData | null>> {
    const workspaceFolders = context.vscodeAPI.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return { success: true, data: null, warnings: ['No workspace folder open.'] };
    }

    const rootFolder = workspaceFolders[0];
    const rootPath = rootFolder.uri.fsPath;
    let projectName = path.basename(rootPath);

    try {
      // 1. Project Name
      const packageJsonUri = vscode.Uri.joinPath(rootFolder.uri, 'package.json');
      const packageJson = await readJsonFileSafe(context.vscodeAPI.workspace.fs, packageJsonUri);
      if (packageJson?.name) {
        projectName = packageJson.name;
      }

      // 2. Top-level files and folders
      const topLevelEntriesRaw = await context.vscodeAPI.workspace.fs.readDirectory(rootFolder.uri);
      const structure: TopLevelEntry[] = topLevelEntriesRaw.map(([name, fileTypeEnum]) => {
        let typeValue: TopLevelEntry['type'];
        switch (fileTypeEnum) {
          case context.vscodeAPI.FileType.File:
            typeValue = 'file';
            break;
          case context.vscodeAPI.FileType.Directory:
            typeValue = 'directory';
            break;
          default:
            typeValue = 'other';
            break;
        }
        return { name, type: typeValue };
      }).slice(0, 25);

      // 3. Primary Language (Heuristic)
      let primaryLanguage = 'unknown';
      try {
        let languageCounts: Record<string, number> = {};
        const excludePattern = '{**/node_modules/**,**/.*/**,**/.git/**,**/dist/**,**/build/**,**/coverage/**,**/*.log,**/yarn.lock,**/package-lock.json}';
        const filesForHeuristic = await context.vscodeAPI.workspace.findFiles('**/*.*', excludePattern, 150);

        filesForHeuristic.forEach(fileUri => {
          const ext = path.extname(fileUri.fsPath).toLowerCase();
          if (ext && ext.length > 1 && ext.length < 6) {
            const lang = ext.substring(1);
            const commonLangMap: Record<string, string> = {
              tsx: 'typescript', jsx: 'javascript', pyw: 'python', htm: 'html',
              cxx: 'cpp', hxx: 'cpp', cc: 'cpp', hh: 'cpp',
              mdx: 'markdown', yml: 'yaml', sh: 'shell', ps1: 'powershell',
              rb: 'ruby', cs: 'csharp', fs: 'fsharp', rs: 'rust',
              kt: 'kotlin', kts: 'kotlin', groovy: 'groovy',
              pl: 'perl', php: 'php', swift: 'swift', sc: 'scala',
              clj: 'clojure', hs: 'haskell', lua: 'lua', R: 'r',
              ts: 'typescript', js: 'javascript', py: 'python', java: 'java', go: 'go'
            };
            const mappedLang = commonLangMap[lang] || lang;
            languageCounts[mappedLang] = (languageCounts[mappedLang] || 0) + 1;
          }
        });

        if (Object.keys(languageCounts).length > 0) {
          primaryLanguage = Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0][0];
        }
      } catch (e) {
        // Ignorar errores en la detección de lenguaje
      }

      const summary: ProjectSummaryData = {
        projectName,
        rootPath: context.vscodeAPI.workspace.asRelativePath(rootFolder.uri, false) || rootFolder.uri.fsPath,
        workspaceName: rootFolder.name,
        topLevelStructure: structure,
        detectedPrimaryLanguage: primaryLanguage,
      };

      return { success: true, data: summary };

    } catch (error: any) {
      console.error('Error in getProjectSummary:', error);
      return { success: false, error: `Failed to get project summary: ${error.message}` };
    }
  }
};