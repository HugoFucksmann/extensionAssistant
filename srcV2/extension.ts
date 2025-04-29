import * as vscode from 'vscode';
import { ExtensionContext } from './core/context/extensionContext';

// Instancia global del contexto de la extensión
let extensionContext: ExtensionContext | null = null;

export async function activate(context: vscode.ExtensionContext) {
  try {
    console.log('Activando extensión AI Assistant...');
    
    // Crear e inicializar el contexto de la extensión
    extensionContext = new ExtensionContext();
    await extensionContext.initializeComponents(context);
    
    console.log('Extensión AI Assistant activada correctamente');
  } catch (error) {
    console.error('Error al activar la extensión:', error);
    vscode.window.showErrorMessage(`Error al activar la extensión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

export function deactivate() {
  if (extensionContext) {
    extensionContext.dispose();
    extensionContext = null;
  }
  console.log('Extensión AI Assistant desactivada');
}