// src/vscode/types.ts
import * as vscode from 'vscode';

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