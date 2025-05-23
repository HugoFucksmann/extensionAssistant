// src/extension.ts
import * as vscode from 'vscode';
import { WebviewProvider } from './vscode/webView/webviewProvider';
import { ComponentFactory } from './core/ComponentFactory';

let webviewProvider: WebviewProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Activating extensionAssistant (Windsurf Architecture)');

  try {
    const windsurfController = ComponentFactory.getWindsurfController(context);

    webviewProvider = new WebviewProvider(context.extensionUri, windsurfController);
    const webviewRegistration = vscode.window.registerWebviewViewProvider(
      'aiChat.chatView',
      webviewProvider,
      { webviewOptions: { retainContextWhenHidden: true } } // Mantener contexto
    );

    const disposables: vscode.Disposable[] = [];

    disposables.push(
      vscode.commands.registerCommand('extensionAssistant.openChat', () => {
        // Al abrir el chat, la vista se resolverá y `resolveWebviewView`
        // eventualmente llamará a `initializeOrRestoreSession` (vía 'uiReady').
        // Forzar el foco es bueno.
        vscode.commands.executeCommand('aiChat.chatView.focus');
      })
    );

    disposables.push(
      vscode.commands.registerCommand('extensionAssistant.chat.history', () => {
        // WebviewProvider ahora tiene un método directo
        webviewProvider?.requestShowHistory();
      })
    );

    disposables.push(
      vscode.commands.registerCommand('extensionAssistant.newChat', () => {
        // WebviewProvider ahora tiene un método directo
        webviewProvider?.startNewChat();
      })
    );

    disposables.push(
      vscode.commands.registerCommand('extensionAssistant.settings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'extensionAssistant');
      })
    );

    // El comando 'extensionAssistant.sendMessage' ya no es necesario aquí,
    // ya que la UI enviará 'userMessageSent' directamente.

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
    webviewProvider.dispose(); // Llamar al dispose del provider
  }
  webviewProvider = undefined;
}