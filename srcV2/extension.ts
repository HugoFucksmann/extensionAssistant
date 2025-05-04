// extension.ts
import * as vscode from 'vscode';

import { ExtensionHandler } from './core/config/extensionHandler';

export async function activate(context: vscode.ExtensionContext) {

  
  try {
    // Inicializar el manejador de la extensión y sus componentes
    const extensionHandler = await ExtensionHandler.initialize(context);
    
    // Registrar comando para mostrar la vista principal
    const disposable = vscode.commands.registerCommand('extensionAssistant.start', () => {
      vscode.window.showInformationMessage('¡Asistente de extensión iniciado!');
      vscode.commands.executeCommand('aiChat.chatView.focus');
    });
    
    context.subscriptions.push(disposable);
    
  
  } catch (error) {

    vscode.window.showErrorMessage(`Error al iniciar el asistente: ${error}`);
  }
}

export function deactivate() {
 
  
  try {
    // Obtener y liberar recursos del manejador de la extensión
    const extensionHandler = ExtensionHandler.getInstance();
    extensionHandler.dispose();
    
   
  } catch (error) {
   
  }
}