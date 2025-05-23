/**
 * Punto de entrada principal para la extensión VS Code
 * Integra la arquitectura Windsurf con VS Code
 */

import * as vscode from 'vscode';
import { WebviewProvider } from './vscode/webView/webviewProvider';
import { ComponentFactory } from './core/ComponentFactory';

// Mantener la referencia al WebviewProvider
let webviewProvider: WebviewProvider | undefined;

/**
 * Función de activación de la extensión
 * Se llama cuando la extensión se activa por primera vez
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Activating extensionAssistant (Windsurf Architecture)');
  
  try {
    // Inicializar el controlador Windsurf a través de ComponentFactory
    const windsurfController = ComponentFactory.getWindsurfController(context);
    
    // Registrar el proveedor de la vista web
    webviewProvider = new WebviewProvider(context.extensionUri, windsurfController);
    const webviewRegistration = vscode.window.registerWebviewViewProvider(
      'aiChat.chatView', // Corrected ID to match package.json
      webviewProvider
    );
    
    // Registrar comandos
    const disposables: vscode.Disposable[] = [];
    
    // Comando para mostrar la vista web
    disposables.push(
      vscode.commands.registerCommand('extensionAssistant.openChat', () => {
        vscode.commands.executeCommand('aiChat.chatView.focus');
        // Ensure we have a chat session when opening the chat
        webviewProvider?.ensureChatSession();
      })
    );
    
    // Comando para mostrar el historial de chats
    disposables.push(
      vscode.commands.registerCommand('extensionAssistant.chat.history', () => {
        if (webviewProvider) {
          webviewProvider.sendMessage('command', {
            command: 'showHistory'
          });
        }
      })
    );
    
    // Comando para nuevo chat
    disposables.push(
      vscode.commands.registerCommand('extensionAssistant.newChat', () => {
        if (webviewProvider) {
          webviewProvider.sendMessage('command', {
            command: 'newChat'
          });
        }
      })
    );
    
    // Comando para abrir configuración
    disposables.push(
      vscode.commands.registerCommand('extensionAssistant.settings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'extensionAssistant');
      })
    );
    
    // Comando para enviar un mensaje al asistente
    disposables.push(
      vscode.commands.registerCommand('extensionAssistant.sendMessage', async () => {
        const message = await vscode.window.showInputBox({
          prompt: 'Escribe tu mensaje para el asistente',
          placeHolder: '¿En qué puedo ayudarte hoy?'
        });
        
        if (message && webviewProvider) {
          await webviewProvider.ensureChatSession();
          webviewProvider.sendMessage('userMessage', {
            text: message,
            timestamp: Date.now()
          });
        }
      })
    );
    
    // Registrar los comandos en el contexto de la extensión
    disposables.forEach(disposable => context.subscriptions.push(disposable));
    context.subscriptions.push(webviewRegistration);
    
    console.log('Extension activated successfully');
  } catch (error) {
    console.error('Error activating extension:', error);
    vscode.window.showErrorMessage('Error al activar la extensión. Por favor, revisa la consola para más detalles.');
  }
}

/**
 * Función de desactivación de la extensión
 * Se llama cuando la extensión se desactiva
 */
export function deactivate() {
  console.log('Deactivating extension');
  // Limpiar recursos si es necesario
  webviewProvider = undefined;
}
