import * as path from 'path';
import { listWorkspaceFilesTool } from '../filesystem/listWorkspaceFilesTool';
import { getPackageDependencies } from './getPackageDependencies';

/**
 * Tool to gather basic information about the project in the workspace.
 * Includes main/secondary languages and production dependencies.
 * @returns An object containing project information.
 * @throws Error if no workspace folder is open (due to getWorkspaceFiles or getPackageDependencies).
 */
export async function getProjectInfo(): Promise<{
    mainLanguage: string,
    secondaryLanguage?: string,
    dependencies: string[]
  }> {

   
    const [languages, dependencies] = await Promise.all([
      detectProjectLanguages(),
 
      getPackageDependencies({})
    ]);

    return {
      mainLanguage: languages.mainLanguage,
      secondaryLanguage: languages.secondaryLanguage,
      dependencies
    };
  }

/**
 * Helper function to detect main and secondary programming languages based on file extensions.
 * @returns An object with mainLanguage and optional secondaryLanguage.
 */
async function detectProjectLanguages(): Promise<{
  mainLanguage: string,
  secondaryLanguage?: string
}> {

  const files = await listWorkspaceFilesTool();
  const languageCount: Record<string, number> = {};

  files.forEach((file: string) => {
    const ext = path.extname(file).toLowerCase();
    // Map extensions to common language names
    if (ext === '.ts') languageCount['TypeScript'] = (languageCount['TypeScript'] || 0) + 1;
    else if (ext === '.js') languageCount['JavaScript'] = (languageCount['JavaScript'] || 0) + 1;
    else if (ext === '.py') languageCount['Python'] = (languageCount['Python'] || 0) + 1;
    else if (ext === '.java') languageCount['Java'] = (languageCount['Java'] || 0) + 1;
    else if (ext === '.cs') languageCount['C#'] = (languageCount['C#'] || 0) + 1;
    else if (ext === '.cpp' || ext === '.cxx' || ext === '.cc' || ext === '.h' || ext === '.hpp') languageCount['C++'] = (languageCount['C++'] || 0) + 1;
    else if (ext === '.c') languageCount['C'] = (languageCount['C'] || 0) + 1;
    else if (ext === '.html' || ext === '.htm') languageCount['HTML'] = (languageCount['HTML'] || 0) + 1;
    else if (ext === '.css') languageCount['CSS'] = (languageCount['CSS'] || 0) + 1;
    else if (ext === '.json') languageCount['JSON'] = (languageCount['JSON'] || 0) + 1;
    else if (ext === '.md') languageCount['Markdown'] = (languageCount['Markdown'] || 0) + 1;
    else if (ext === '.yaml' || ext === '.yml') languageCount['YAML'] = (languageCount['YAML'] || 0) + 1;
    else if (ext === '.xml') languageCount['XML'] = (languageCount['XML'] || 0) + 1;
    else if (ext === '.sh') languageCount['Shell'] = (languageCount['Shell'] || 0) + 1;
    else if (ext === '.go') languageCount['Go'] = (languageCount['Go'] || 0) + 1;
    else if (ext === '.rb') languageCount['Ruby'] = (languageCount['Ruby'] || 0) + 1;
    else if (ext === '.php') languageCount['PHP'] = (languageCount['PHP'] || 0) + 1;
    else if (ext === '.swift') languageCount['Swift'] = (languageCount['Swift'] || 0) + 1;
    else if (ext === '.kt') languageCount['Kotlin'] = (languageCount['Kotlin'] || 0) + 1;

  });

  const sortedLanguages = Object.entries(languageCount)
    .sort((a, b) => b[1] - a[1]) 
    .map(([lang]) => lang); 

  return {
    mainLanguage: sortedLanguages[0] || 'Unknown',
    secondaryLanguage: sortedLanguages[1] 
  };
}

