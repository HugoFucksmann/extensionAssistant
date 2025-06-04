import * as vscode from 'vscode';
import { WebviewProvider } from './vscode/webView/core/WebviewProvider';

export class CommandManager {
  constructor(private readonly webviewProvider: WebviewProvider) { }

  public getCommands(): vscode.Disposable[] {
    return [
      this.createOpenChatCommand(),
      this.createHistoryCommand(),
      this.createNewChatCommand(),
      this.createSettingsCommand(),
    ];
  }

  private createOpenChatCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('extensionAssistant.openChat', () => {
      vscode.commands.executeCommand('aiChat.chatView.focus');
    });
  }

  private createHistoryCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('extensionAssistant.chat.history', () => {
      this.webviewProvider.requestShowHistory();
    });
  }

  private createNewChatCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('extensionAssistant.newChat', () => {
      this.webviewProvider.startNewChat();
    });
  }

  private createSettingsCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('extensionAssistant.settings', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'extensionAssistant');
    });
  }


}