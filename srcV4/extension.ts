/**
 * Punto de entrada principal para la extensión VS Code
 * Integra la arquitectura Windsurf con VS Code
 */

import * as vscode from 'vscode';
import { WindsurfController } from './core/windsurfController';
import { WebviewProvider } from './ui/webView/webviewProvider';
import { VSCodeContext } from './core/types';

// Mantener la referencia al WebviewProvider
let webviewProvider: WebviewProvider | undefined;

/**
 * Función de activación de la extensión
 * Se llama cuando la extensión se activa por primera vez
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Activating extensionAssistant V4 (Windsurf Architecture)');
  
  // Crear el contexto de VS Code para la extensión
  const vscodeContext: VSCodeContext = {
    extensionUri: context.extensionUri,
    extensionPath: context.extensionPath,
    subscriptions: context.subscriptions,
    outputChannel: vscode.window.createOutputChannel('Extension Assistant V4')
  };
  
  // Inicializar el controlador Windsurf
  const windsurfController = WindsurfController.getInstance(vscodeContext);
  
  // Registrar el proveedor de la vista web
  webviewProvider = new WebviewProvider(context.extensionUri, windsurfController);
  const webviewRegistration = vscode.window.registerWebviewViewProvider(
    'extensionAssistant.webview',
    webviewProvider
  );
  
  // Registrar comandos
  const disposables: vscode.Disposable[] = [];
  
  // Comando para mostrar la vista web
  disposables.push(
    vscode.commands.registerCommand('extensionAssistant.showWebview', () => {
      vscode.commands.executeCommand('extensionAssistant.webview.focus');
    })
  );
  
  // Comando para enviar un mensaje al asistente
  disposables.push(
    vscode.commands.registerCommand('extensionAssistant.sendMessage', async () => {
      const message = await vscode.window.showInputBox({
        placeHolder: '¿En qué puedo ayudarte?',
        prompt: 'Envía un mensaje al asistente'
      });
      
      if (message && webviewProvider) {
        webviewProvider.sendMessage('userMessage', { content: message });
      }
    })
  );
  
  // Comando para limpiar la conversación actual
  disposables.push(
    vscode.commands.registerCommand('extensionAssistant.clearConversation', () => {
      if (webviewProvider) {
        webviewProvider.sendMessage('clearConversation', {});
      }
    })
  );
  
  // Añadir todos los disposables al contexto de la extensión
  context.subscriptions.push(...disposables);
  
  // Mostrar un mensaje de información
  vscode.window.showInformationMessage('Extension Assistant V4 activado');
  
  // Mostrar automáticamente la vista web si está configurado
  const config = vscode.workspace.getConfiguration('extensionAssistant');
  if (config.get<boolean>('openPanelOnStartup', false)) {
    vscode.commands.executeCommand('extensionAssistant.showWebview');
  }
}

/**
 * Función de desactivación de la extensión
 * Se llama cuando la extensión se desactiva
 */
export function deactivate() {
  console.log('Extension Assistant V4 desactivado');
  // Limpiar recursos
  const controller = WindsurfController.getInstance();
  controller.dispose();
  
  console.log('Extension Assistant V4 (Windsurf) desactivado');
}
