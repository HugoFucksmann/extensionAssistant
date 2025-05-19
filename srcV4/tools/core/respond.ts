import * as vscode from 'vscode';
import { ToolResult } from '../types';

/**
 * Parámetros para la herramienta de respuesta
 */
export interface RespondParams {
  message: string;
  markdown?: boolean;
  showNotification?: boolean;
  updateUI?: boolean;
}

/**
 * Herramienta para generar respuestas al usuario
 * @param params Parámetros de la herramienta
 * @returns Resultado de la operación
 */
export async function respond(params: RespondParams): Promise<ToolResult<{ delivered: boolean }>> {
  try {
    const { 
      message, 
      markdown = true, 
      showNotification = false,
      updateUI = true 
    } = params;
    
    if (!message || typeof message !== 'string') {
      throw new Error(`Invalid message parameter: ${JSON.stringify(message)}. Expected a string.`);
    }
    
    // Emitir un evento personalizado para actualizar la UI
    if (updateUI) {
      // Este evento será capturado por WindsurfPanel para actualizar la UI
      vscode.commands.executeCommand('extensionAssistant.updateResponse', {
        message,
        isMarkdown: markdown
      });
    }
    
    // Mostrar notificación si se solicita
    if (showNotification) {
      vscode.window.showInformationMessage(message);
    }
    
    return {
      success: true,
      data: {
        delivered: true
      }
    };
  } catch (error: any) {
    console.error(`[respond] Error:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
