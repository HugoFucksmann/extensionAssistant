// src/features/tools/definitions/workspace.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ToolDefinition } from '../types';

export const getProjectInfo: ToolDefinition = {
  name: 'getProjectInfo',
  description: 'Gets project information including package.json, git info, and file statistics',
  parameters: {},
  async execute() {
    try {
      // Verificar que haya un workspace abierto
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error('No workspace folders found');
      }
      
      const rootFolder = workspaceFolders[0];
      const rootPath = rootFolder.uri.fsPath;
      const workspaceFolderPaths = workspaceFolders.map(folder => folder.uri.fsPath);
      
      // Obtener nombre del proyecto
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
      const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
      const fileStats = {
        totalFiles: files.length,
        byExtension: {} as Record<string, number>
      };
      
      // Contar archivos por extensión
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
      
      return {
        success: true,
        data: projectInfo
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export const searchWorkspace: ToolDefinition = {
  name: 'searchWorkspace',
  description: 'Search for text in workspace files',
  parameters: {
    query: {
      type: 'string',
      description: 'Search query',
      required: true
    },
    includePattern: {
      type: 'string',
      description: 'File pattern to include (glob)',
      default: '**/*'
    },
    excludePattern: {
      type: 'string',
      description: 'File pattern to exclude (glob)',
      required: false
    },
    maxResults: {
      type: 'number',
      description: 'Maximum number of results',
      default: 100,
      minimum: 1,
      maximum: 1000
    },
    isCaseSensitive: {
      type: 'boolean',
      description: 'Case sensitive search',
      default: false
    },
    isRegExp: {
      type: 'boolean',
      description: 'Use regular expression',
      default: false
    },
    isWholeWord: {
      type: 'boolean',
      description: 'Match whole words only',
      default: false
    }
  },
  async execute(params: {
    query: string;
    includePattern?: string;
    excludePattern?: string;
    maxResults?: number;
    isCaseSensitive?: boolean;
    isRegExp?: boolean;
    isWholeWord?: boolean;
  }) {
    try {
      const {
        query,
        includePattern = '**/*',
        excludePattern,
        maxResults = 100,
        isCaseSensitive = false,
        isRegExp = false,
        isWholeWord = false
      } = params;
      
      if (!query || typeof query !== 'string') {
        throw new Error(`Invalid query parameter: ${JSON.stringify(query)}. Expected a string.`);
      }

      // Get all matching files
      const files = await vscode.workspace.findFiles(
        includePattern,
        excludePattern ? excludePattern : undefined,
        maxResults
      );

      const results: Array<{
        uri: string;
        fileName: string;
        lineNumber: number;
        lineText: string;
        matchText: string;
      }> = [];
      let resultCount = 0;

      // Search in each file
      for (const file of files) {
        if (resultCount >= maxResults) break;

        try {
          const document = await vscode.workspace.openTextDocument(file);
          const text = document.getText();
          
          // Create regex pattern based on parameters
          let pattern = isRegExp ? query : 
            query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          if (isWholeWord) {
            pattern = `\\b${pattern}\\b`;
          }
          
          const flags = isCaseSensitive ? 'g' : 'gi';
          const regex = new RegExp(pattern, flags);
          
          // Search in each line
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
              
              // Avoid infinite loop for zero-length matches
              if (match.index === regex.lastIndex) {
                regex.lastIndex++;
              }
            }
          }
        } catch (error) {
          console.warn(`Error processing file ${file.fsPath}:`, error);
        }
      }
      
      return {
        success: true,
        data: { results }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};