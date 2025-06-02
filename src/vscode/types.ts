// src/vscode/types.ts
import * as vscode from 'vscode';

declare global {
  const window: any;
  const document: any;
  const MutationObserver: {
    new(callback: (mutations: any[], observer: any) => void): MutationObserver;
  };
}

interface MutationObserver {
  observe(target: any, config: { attributes: boolean; attributeFilter: string[] }): void;
  disconnect(): void;
}

export interface VSCodeContext {
  extensionUri: vscode.Uri;
  extensionPath: string;
  subscriptions: vscode.Disposable[];
  outputChannel: vscode.OutputChannel;
  workspaceFolders?: readonly vscode.WorkspaceFolder[];
  activeTextEditor?: vscode.TextEditor;
  globalState: vscode.Memento;
  workspaceState: vscode.Memento;
}