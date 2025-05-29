import * as vscode from 'vscode';
import { WebviewProvider } from './vscode/webView/webviewProvider';
import { PermissionManager } from './features/tools/PermissionManager';

export class CommandManager {
  constructor(private readonly webviewProvider: WebviewProvider) {}

  public getCommands(): vscode.Disposable[] {
    return [
      this.createOpenChatCommand(),
      this.createHistoryCommand(),
      this.createNewChatCommand(),
      this.createSettingsCommand(),
      this.createToggleTestModeCommand(),
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

  private createToggleTestModeCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('extensionAssistant.toggleTestMode', () => {
      const currentTestMode = PermissionManager.isTestModeEnabled();
      const newTestMode = !currentTestMode;
      
      PermissionManager.setTestMode(newTestMode);
      this.webviewProvider.notifyTestModeChange(newTestMode);
      
      vscode.window.showInformationMessage(
        `Modo de prueba ${newTestMode ? 'habilitado' : 'deshabilitado'}. ${
          newTestMode 
            ? 'Todos los permisos serán aprobados automáticamente.' 
            : 'Los permisos serán verificados normalmente.'
        }`
      );
    });
  }
}