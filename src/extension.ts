import * as vscode from 'vscode';
import { ChatViewProvider } from './vscode_integration/uiProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "extensionAssistant" is now active!');

  // Registrar el proveedor de webview para la vista de chat
  const chatViewProvider = new ChatViewProvider(context.extensionUri);
  
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChatViewProvider.viewType,
      chatViewProvider
    )
  );

  // Registrar un comando para abrir la vista de chat
  context.subscriptions.push(
    vscode.commands.registerCommand('extensionAssistant.openChat', () => {
      vscode.commands.executeCommand('workbench.view.extension.ai-chat-sidebar');
    })
  );

  // Registrar un comando para enviar un mensaje de prueba
  context.subscriptions.push(
    vscode.commands.registerCommand('extensionAssistant.sendTestMessage', () => {
      chatViewProvider.sendMessageToWebview({
        command: 'receiveMessage',
        text: 'Este es un mensaje de prueba desde la extensión',
        isUser: false
      });
    })
  );
}

export function deactivate() {
  // Limpiar recursos cuando se desactive la extensión
  console.log('Extension "extensionAssistant" is now deactivated!');
}