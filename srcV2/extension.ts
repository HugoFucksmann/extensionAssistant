// extension.ts
import * as vscode from 'vscode';
import { logger } from './utils/logger';
import { ExtensionHandler } from './core/config/extensionHandler';

export async function activate(context: vscode.ExtensionContext) {
  logger.info('Activando extensión...');
  
  try {
    // Inicializar el manejador de la extensión y sus componentes
    const extensionHandler = await ExtensionHandler.initialize(context);
    
    // Registrar comando para mostrar la vista principal
    const disposable = vscode.commands.registerCommand('extensionAssistant.start', () => {
      vscode.window.showInformationMessage('¡Asistente de extensión iniciado!');
      vscode.commands.executeCommand('aiChat.chatView.focus');
    });
    
    context.subscriptions.push(disposable);
    
    logger.info('Extensión activada correctamente');
  } catch (error) {
    logger.error('Error al activar la extensión:', {error});
    vscode.window.showErrorMessage(`Error al iniciar el asistente: ${error}`);
  }
}

export function deactivate() {
  logger.info('Desactivando extensión...');
  
  try {
    // Obtener y liberar recursos del manejador de la extensión
    const extensionHandler = ExtensionHandler.getInstance();
    extensionHandler.dispose();
    
    logger.info('Extensión desactivada correctamente');
  } catch (error) {
    logger.error('Error al desactivar la extensión:', {error});
  }
}