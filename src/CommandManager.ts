// src/CommandManager.ts
import * as vscode from 'vscode';
import { WebviewProvider } from './vscode/webView/core/WebviewProvider';

export class CommandManager {
  private commands: vscode.Disposable[] = [];

  constructor(private readonly webviewProvider: WebviewProvider) {
    this.commands = [
      this.createOpenChatCommand(),
      this.createHistoryCommand(),
      this.createNewChatCommand(),
      this.createSettingsCommand(),
    ];
  }

  public getCommands(): vscode.Disposable[] {
    return this.commands;
  }

  // --- CAMBIOS DE CONSISTENCIA EN LOS NOMBRES DE COMANDOS ---
  private createOpenChatCommand(): vscode.Disposable {
    // El comando para enfocar la vista debe seguir el patrón de la vista.
    return vscode.commands.registerCommand('extensionAssistant.chat.focus', () => {
      vscode.commands.executeCommand('aiChat.chatView.focus');
    });
  }

  private createHistoryCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('extensionAssistant.chat.history', () => {
      this.webviewProvider.requestShowHistory();
    });
  }

  private createNewChatCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('extensionAssistant.chat.new', () => {
      this.webviewProvider.startNewChat();
    });
  }

  private createSettingsCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('extensionAssistant.settings.open', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'extensionAssistant');
    });
  }

  public dispose(): void {
    this.commands.forEach(command => command.dispose());
  }
}