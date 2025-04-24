import * as vscode from 'vscode';
import { ExtensionContext as AppContext } from './core/extensionContext';

// Instancia global del contexto de la aplicación
let appContext: AppContext | undefined;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Extension "extensionAssistant" is now active!');

  try {
    // Crear e inicializar el contexto de la aplicación
    appContext = new AppContext();
    await appContext.initializeComponents(context);
    
    console.log('Extension "extensionAssistant" inicializada correctamente');
  } catch (error) {
    console.error('Error al activar la extensión:', error);
    vscode.window.showErrorMessage(`Error al inicializar la extensión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

export function deactivate() {
  console.log('Extension "extensionAssistant" is now deactivating...');
  
  // Liberar recursos
  if (appContext) {
    appContext.dispose();
    appContext = undefined;
  }
  
  console.log('Extension "extensionAssistant" is now deactivated!');
}