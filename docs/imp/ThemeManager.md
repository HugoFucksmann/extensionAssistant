// src/vscode/managers/ThemeManager.ts
import * as vscode from 'vscode';

export class ThemeManager {
  constructor(
    private postMessageToUI: (type: string, payload: any) => void
  ) {}

  public setup(disposables: vscode.Disposable[]): void {
    this.sendCurrentTheme();
    
    disposables.push(
      vscode.window.onDidChangeActiveColorTheme(() => {
        this.sendCurrentTheme();
      })
    );
  }

  private sendCurrentTheme(): void {
    this.postMessageToUI('themeChanged', {
      isDarkMode: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark,
    });
  }
}