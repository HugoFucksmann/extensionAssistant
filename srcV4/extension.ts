/**
 * Punto de entrada principal para la extensión VS Code
 * Integra la arquitectura Windsurf con VS Code
 */

import * as vscode from 'vscode';
import { WindsurfController } from './core/windsurfController_OLD';
import { WindsurfPanel } from './ui/windsurfPanel';
import { VSCodeContext } from './core/types';

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
  
  // Registrar comandos
  const disposables: vscode.Disposable[] = [];
  
  // Comando para abrir el panel de la extensión
  disposables.push(
    vscode.commands.registerCommand('extensionAssistant.openWindsurfPanel', () => {
      WindsurfPanel.createOrShow(context.extensionUri, windsurfController);
    })
  );
  
  // Comando para enviar un mensaje al asistente
  disposables.push(
    vscode.commands.registerCommand('extensionAssistant.sendMessage', async () => {
      const message = await vscode.window.showInputBox({
        placeHolder: '¿En qué puedo ayudarte?',
        prompt: 'Envía un mensaje al asistente'
      });
      
      if (message) {
        // Obtener el panel activo o crear uno nuevo
        const panel = WindsurfPanel.createOrShow(context.extensionUri, windsurfController);
        
        // Enviar el mensaje al panel
        panel.sendMessage(message);
      }
    })
  );
  
  // Comando para limpiar la conversación actual
  disposables.push(
    vscode.commands.registerCommand('extensionAssistant.clearConversation', () => {
      const panel = WindsurfPanel.getCurrentPanel();
      if (panel) {
        panel.clearConversation();
      }
    })
  );
  
  // Añadir todos los disposables al contexto de la extensión
  context.subscriptions.push(...disposables);
  
  // Mostrar un mensaje de información
  vscode.window.showInformationMessage('Extension Assistant V4 (Windsurf) activado');
  
  // Abrir automáticamente el panel si está configurado
  const config = vscode.workspace.getConfiguration('extensionAssistant');
  if (config.get<boolean>('openPanelOnStartup', false)) {
    vscode.commands.executeCommand('extensionAssistant.openWindsurfPanel');
  }
}

/**
 * Función de desactivación de la extensión
 * Se llama cuando la extensión se desactiva
 */
export function deactivate() {
  // Limpiar recursos
  const controller = WindsurfController.getInstance();
  controller.dispose();
  
  console.log('Extension Assistant V4 (Windsurf) desactivado');
}
