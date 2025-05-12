import * as path from 'path';
import { getWorkspaceFiles } from '../tools/filesystemTools/getWorkspaceFiles';
import { getPackageDependencies } from '../tools/filesystemTools/getPackageDependencies';
import { getMainWorkspacePath } from '../tools/filesystemTools/core';

export async function getProjectInfo(): Promise<{
    mainLanguage: string,
    secondaryLanguage?: string,
    dependencies: string[]
  }> {
   
    const [languages, dependencies] = await Promise.all([
      detectProjectLanguages(),
      getPackageDependencies(getMainWorkspacePath())
    ]);
  
    return {
      mainLanguage: languages.mainLanguage,
      secondaryLanguage: languages.secondaryLanguage,
      dependencies
    };
  }

async function detectProjectLanguages(): Promise<{
  mainLanguage: string, 
  secondaryLanguage?: string
}> {
  const files = await getWorkspaceFiles();
  const languageCount: Record<string, number> = {};

  files.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.ts') languageCount['TypeScript'] = (languageCount['TypeScript'] || 0) + 1;
    else if (ext === '.js') languageCount['JavaScript'] = (languageCount['JavaScript'] || 0) + 1;
    // Agregar más lenguajes según necesidad
  });

  const sortedLanguages = Object.entries(languageCount)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);

  return {
    mainLanguage: sortedLanguages[0] || 'Unknown',
    secondaryLanguage: sortedLanguages[1]
  };
}