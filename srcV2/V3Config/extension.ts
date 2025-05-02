import * as vscode from 'vscode';
import { ExtensionHandler } from './core/config/extensionHandler';
import { logger } from './utils/logger';
import { ErrorHandler } from './utils/errorHandler';

// Manejador de errores global para reportes de errores
export const errorHandler = new ErrorHandler();

export async function activate(context: vscode.ExtensionContext) {
  try {
    logger.info('Activando extensión AI Assistant...');
    
    // Inicializar el manejador de extensión (contenedor principal de componentes)
    // El nuevo diseño hace toda la inicialización en un solo lugar
    const extensionHandler = await ExtensionHandler.initialize(context);
    
    // Registrar limpieza en la desactivación
    context.subscriptions.push({
      dispose: () => extensionHandler.dispose()
    });
    
    logger.info('Extensión AI Assistant activada correctamente');
  } catch (error) {
    logger.error('Error al activar la extensión:', error);
    vscode.window.showErrorMessage(
      `Fallo en la activación de la extensión: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

export function deactivate() {
  try {
    // Intentar obtener la instancia del manejador si existe
    const extensionHandler = ExtensionHandler.getInstance();
    extensionHandler.dispose();
    logger.info('Extensión AI Assistant desactivada');
  } catch (error) {
    // Puede fallar si getInstance se llama antes de la inicialización o después de la liberación
    logger.info('Extensión AI Assistant desactivada (sin manejador que liberar)');
  }
}