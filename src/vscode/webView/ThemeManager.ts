import * as vscode from 'vscode';

export class ThemeManager {
    constructor(
      private postMessageToUI: (type: string, payload: any) => void
    ) {}
  
    public setup(disposables: vscode.Disposable[]): void {
      // Send initial theme
      this.sendCurrentTheme();
      
      // Listen for theme changes
      disposables.push(
        vscode.window.onDidChangeActiveColorTheme((theme) => {
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