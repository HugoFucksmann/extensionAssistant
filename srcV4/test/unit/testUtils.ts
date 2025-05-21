import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

/**
 * Crea un archivo temporal para pruebas
 */
export async function createTempFile(content: string = '', extension: string = 'txt'): Promise<string> {
  const tempDir = path.join(tmpdir(), 'windsurf-tests');
  await fs.mkdir(tempDir, { recursive: true });
  
  const fileName = `test-${Date.now()}-${Math.floor(Math.random() * 10000)}.${extension}`;
  const filePath = path.join(tempDir, fileName);
  
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Elimina un archivo temporal
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignorar errores si el archivo no existe
  }
}

/**
 * Crea un directorio temporal para pruebas
 */
export async function createTempDir(): Promise<string> {
  const tempDir = path.join(tmpdir(), 'windsurf-tests', `dir-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Elimina un directorio temporal
 */
export async function cleanupTempDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    // Ignorar errores si el directorio no existe
  }
}

/**
 * Mock básico para vscode.workspace
 */
export function setupVSCodeMock() {
  const workspaceFolders: vscode.WorkspaceFolder[] = [];
  
  // @ts-ignore
  jest.spyOn(vscode.workspace, 'workspaceFolders', 'get').mockImplementation(() => workspaceFolders);
  
  return {
    addWorkspaceFolder: (folderPath: string) => {
      const folder: vscode.WorkspaceFolder = {
        uri: vscode.Uri.file(folderPath),
        name: folderPath.split(/[\\/]/).pop() || 'workspace',
        index: workspaceFolders.length
      };
      workspaceFolders.push(folder);
      return folder;
    },
    clearWorkspaceFolders: () => {
      workspaceFolders.length = 0;
    }
  };
}

/**
 * Mock para vscode.window.activeTextEditor
 */
export function setupActiveEditorMock(content: string = '', language: string = 'plaintext') {
  const document = {
    getText: () => content,
    languageId: language,
    uri: vscode.Uri.file(path.join(tmpdir(), 'test-file.txt')),
    isDirty: false,
    save: jest.fn().mockResolvedValue(true)
  };
  
  const editor = {
    document,
    selection: new vscode.Selection(0, 0, 0, 0),
    edit: jest.fn().mockImplementation((callback) => {
      return new Promise((resolve) => {
        const editBuilder = {
          replace: jest.fn(),
          insert: jest.fn(),
          delete: jest.fn()
        };
        callback(editBuilder);
        resolve(true);
      });
    })
  };
  
  jest.spyOn(vscode.window, 'activeTextEditor', 'get').mockImplementation(() => editor as any);
  
  return {
    document,
    editor,
    setContent: (newContent: string) => {
      document.getText = () => newContent;
    },
    setLanguage: (lang: string) => {
      document.languageId = lang;
    }
  };
}
