import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ToolResult } from '../../types';

/**
 * Información del proyecto
 */
export interface ProjectInfo {
  name: string;
  rootPath: string;
  workspaceFolders: string[];
  packageJson?: {
    name: string;
    version: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    scripts: Record<string, string>;
  };
  gitInfo?: {
    hasGit: boolean;
    currentBranch?: string;
  };
  fileStats: {
    totalFiles: number;
    byExtension: Record<string, number>;
  };
}

/**
 * Herramienta para obtener información del proyecto
 * @returns Resultado con la información del proyecto
 */
export async function getProjectInfo(): Promise<ToolResult<ProjectInfo>> {
  try {
    // Verificar que haya un workspace abierto
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace folders found');
    }
    
    const rootFolder = workspaceFolders[0];
    const rootPath = rootFolder.uri.fsPath;
    const workspaceFolderPaths = workspaceFolders.map(folder => folder.uri.fsPath);
    
    // Obtener nombre del proyecto (del package.json o del nombre de la carpeta)
    let projectName = path.basename(rootPath);
    let packageJson: any = undefined;
    
    // Intentar leer el package.json
    const packageJsonPath = path.join(rootPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
        packageJson = JSON.parse(packageJsonContent);
        if (packageJson.name) {
          projectName = packageJson.name;
        }
      } catch (err) {
        console.warn('Error reading package.json:', err);
      }
    }
    
    // Verificar si es un repositorio git
    const gitInfo: { hasGit: boolean; currentBranch?: string } = {
      hasGit: false
    };
    
    const gitPath = path.join(rootPath, '.git');
    if (fs.existsSync(gitPath)) {
      gitInfo.hasGit = true;
      
      // Intentar obtener la rama actual
      try {
        const headPath = path.join(gitPath, 'HEAD');
        if (fs.existsSync(headPath)) {
          const headContent = fs.readFileSync(headPath, 'utf-8').trim();
          const match = headContent.match(/ref: refs\/heads\/(.+)/);
          if (match && match[1]) {
            gitInfo.currentBranch = match[1];
          }
        }
      } catch (err) {
        console.warn('Error reading git branch:', err);
      }
    }
    
    // Obtener estadísticas de archivos
    const fileStats = await getFileStats(rootPath);
    
    const projectInfo: ProjectInfo = {
      name: projectName,
      rootPath,
      workspaceFolders: workspaceFolderPaths,
      packageJson,
      gitInfo,
      fileStats
    };
    
    return {
      success: true,
      data: projectInfo
    };
  } catch (error: any) {
    console.error(`[getProjectInfo] Error:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtiene estadísticas de archivos en un directorio
 * @param dirPath Ruta del directorio
 * @returns Estadísticas de archivos
 */
async function getFileStats(dirPath: string): Promise<{
  totalFiles: number;
  byExtension: Record<string, number>;
}> {
  const stats = {
    totalFiles: 0,
    byExtension: {} as Record<string, number>
  };
  
  // Usar la API de VS Code para buscar archivos
  const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
  
  stats.totalFiles = files.length;
  
  // Contar archivos por extensión
  for (const file of files) {
    const ext = path.extname(file.fsPath).toLowerCase();
    if (ext) {
      const extName = ext.slice(1); // Eliminar el punto inicial
      stats.byExtension[extName] = (stats.byExtension[extName] || 0) + 1;
    }
  }
  
  return stats;
}
