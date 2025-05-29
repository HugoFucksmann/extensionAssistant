// src/extension.ts
import * as vscode from 'vscode';
import { WebviewProvider } from './vscode/webView/webviewProvider';
import { ComponentFactory } from './core/ComponentFactory';
import { PermissionManager } from './features/tools/PermissionManager';

let webviewProvider: WebviewProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Activating extensionAssistant (Windsurf Architecture)');

  try {
   
    const appLogicService = ComponentFactory.getApplicationLogicService(context);
    const dispatcher = ComponentFactory.getInternalEventDispatcher(); // <--- AÑADIDO

  
    // Pasa el dispatcher al WebviewProvider
    webviewProvider = new WebviewProvider(context.extensionUri, appLogicService, dispatcher); // <--- MODIFICADO

    const webviewRegistration = vscode.window.registerWebviewViewProvider(
      'aiChat.chatView',
      webviewProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    );

    
    const disposables: vscode.Disposable[] = [];

    disposables.push(
      vscode.commands.registerCommand('extensionAssistant.openChat', () => {
        vscode.commands.executeCommand('aiChat.chatView.focus');
      })
    );

    disposables.push(
      vscode.commands.registerCommand('extensionAssistant.chat.history', () => {
        webviewProvider?.requestShowHistory();
      })
    );

    disposables.push(
      vscode.commands.registerCommand('extensionAssistant.newChat', () => {
        webviewProvider?.startNewChat();
      })
    );

    disposables.push(
      vscode.commands.registerCommand('extensionAssistant.settings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'extensionAssistant');
      })
    );

    // Comando para habilitar/deshabilitar el modo de prueba
    disposables.push(
      vscode.commands.registerCommand('extensionAssistant.toggleTestMode', () => {
        const currentTestMode = PermissionManager.isTestModeEnabled();
        const newTestMode = !currentTestMode;
        PermissionManager.setTestMode(newTestMode);
        
        // Notificar al webview sobre el cambio de modo
        webviewProvider?.notifyTestModeChange(newTestMode);
        
        /* vscode.window.showInformationMessage(
          `Modo de prueba ${newTestMode ? 'habilitado' : 'deshabilitado'}. ${newTestMode ? 'Todos los permisos serán aprobados automáticamente.' : 'Los permisos serán verificados normalmente.'}`
        ); */
      })
    );

    disposables.forEach(disposable => context.subscriptions.push(disposable));
    context.subscriptions.push(webviewRegistration);


    console.log('Extension activated successfully');
  } catch (error) {
    console.error('Error activating extension:', error);
    vscode.window.showErrorMessage(
      'Error al activar la extensión. Por favor, revisa la consola para más detalles.'
    );
  }
}

export function deactivate() {
  console.log('Deactivating extension');
  if (webviewProvider) {
    webviewProvider.dispose();
  }
  webviewProvider = undefined;

  
  ComponentFactory.dispose();
  console.log('Extension deactivated.');
}