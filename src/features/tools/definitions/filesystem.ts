// src/features/tools/definitions/filesystem.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ToolDefinition, ToolResult, ParameterDefinition } from '../types';

const filePathParam: ParameterDefinition = {
  type: 'string',
  description: 'Path to the file',
  required: true
};

const relativeToParam: ParameterDefinition = {
  type: 'string',
  description: 'Whether path is relative to workspace or absolute',
  enum: ['workspace', 'absolute'],
  default: 'workspace'
};

export const getFileContents: ToolDefinition = {
  name: 'getFileContents',
  description: 'Gets the content of a file',
  parameters: {
    filePath: filePathParam,
    relativeTo: relativeToParam
  },
  async execute(params: { filePath: string; relativeTo?: string }) {
    try {
      const { filePath, relativeTo = 'workspace' } = params;
      
      let fullPath: string;
      if (relativeTo === 'workspace') {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
          throw new Error('No workspace folder found');
        }
        fullPath = path.join(workspaceFolder, filePath);
      } else {
        fullPath = filePath;
      }
      
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      return {
        success: true,
        data: { content, path: fullPath }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export const writeToFile: ToolDefinition = {
  name: 'writeToFile',
  description: 'Writes content to a file',
  parameters: {
    filePath: filePathParam,
    content: {
      type: 'string',
      description: 'Content to write to the file',
      required: true
    },
    relativeTo: relativeToParam,
    createIfNotExists: {
      type: 'boolean',
      description: 'Create file if it does not exist',
      default: true
    }
  },
  async execute(params: { filePath: string; content: string; relativeTo?: string; createIfNotExists?: boolean }) {
    try {
      const { filePath, content, relativeTo = 'workspace', createIfNotExists = true } = params;
      
      let fullPath: string;
      if (relativeTo === 'workspace') {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
          throw new Error('No workspace folder found');
        }
        fullPath = path.join(workspaceFolder, filePath);
      } else {
        fullPath = filePath;
      }
      
      // Create directory if it doesn't exist
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Check if file exists
      if (!createIfNotExists && !fs.existsSync(fullPath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }
      
      fs.writeFileSync(fullPath, content, 'utf-8');
      
      return {
        success: true,
        data: { path: fullPath }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export const listFiles: ToolDefinition = {
  name: 'listFiles',
  description: 'Lists files in a directory',
  parameters: {
    dirPath: {
      type: 'string',
      description: 'Path to the directory',
      required: true
    },
    relativeTo: relativeToParam,
    includePattern: {
      type: 'string',
      description: 'Pattern to include files (regex)',
      required: false
    },
    excludePattern: {
      type: 'string',
      description: 'Pattern to exclude files (regex)',
      required: false
    },
    recursive: {
      type: 'boolean',
      description: 'List files recursively',
      default: false
    }
  },
  async execute(params: { 
    dirPath: string; 
    relativeTo?: string; 
    includePattern?: string; 
    excludePattern?: string; 
    recursive?: boolean 
  }) {
    try {
      const { dirPath, relativeTo = 'workspace', includePattern, excludePattern, recursive = false } = params;
      
      let fullPath: string;
      if (relativeTo === 'workspace') {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
          throw new Error('No workspace folder found');
        }
        fullPath = path.join(workspaceFolder, dirPath);
      } else {
        fullPath = dirPath;
      }
      
      if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
        throw new Error(`Directory not found: ${dirPath}`);
      }
      
      const includeRegex = includePattern ? new RegExp(includePattern) : null;
      const excludeRegex = excludePattern ? new RegExp(excludePattern) : null;
      
      const listFilesRecursive = (dir: string): any[] => {
        const files: any[] = [];
        const entries = fs.readdirSync(dir);
        
        for (const entry of entries) {
          const entryPath = path.join(dir, entry);
          const stat = fs.statSync(entryPath);
          const isDirectory = stat.isDirectory();
          
          if (excludeRegex && excludeRegex.test(entry)) continue;
          if (includeRegex && !isDirectory && !includeRegex.test(entry)) continue;
          
          const fileInfo = {
            name: entry,
            path: entryPath,
            isDirectory,
            ...(isDirectory ? {} : { 
              size: stat.size, 
              extension: path.extname(entry).slice(1) 
            })
          };
          
          files.push(fileInfo);
          
          if (isDirectory && recursive) {
            files.push(...listFilesRecursive(entryPath));
          }
        }
        
        return files;
      };
      
      return {
        success: true,
        data: { files: listFilesRecursive(fullPath) }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};