// src/extension.ts
import * as vscode from 'vscode';
import { WebviewProvider } from './vscode/webView/webviewProvider';
import { ComponentFactory } from './core/ComponentFactory'; // Asegúrate que la ruta es correcta

let webviewProvider: WebviewProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Activating extensionAssistant (Windsurf Architecture)');

  try {
    // Obtener el ApplicationLogicService a través de la factory
    // La factory también inicializará el InternalEventDispatcher y EventLogger
    const appLogicService = ComponentFactory.getApplicationLogicService(context);
    const dispatcher = ComponentFactory.getInternalEventDispatcher(); // Obtener el dispatcher

    // WebviewProvider necesitará el ApplicationLogicService y el dispatcher
    webviewProvider = new WebviewProvider(context.extensionUri, appLogicService);

    const webviewRegistration = vscode.window.registerWebviewViewProvider(
      'aiChat.chatView',
      webviewProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    );

    // ... (resto de tus comandos, no cambian mucho aquí) ...
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

  // Llamar al dispose de la factory para limpiar los singletons
  ComponentFactory.dispose();
  console.log('Extension deactivated.');
}