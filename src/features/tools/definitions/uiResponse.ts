// src/features/tools/definitions/core.ts
// import * as vscode from 'vscode'; // NO MÁS
import { ToolDefinition, ToolExecutionContext } from '../types';

export const respond: ToolDefinition = {
  name: 'respond',
  description: 'Sends a response to the user',
  parameters: { /*...*/ },
  // No requiere permisos especiales de VS Code, pero sí interacción con UI
  // requiredPermissions: ['interaction.userInput'] // Podría ser, si se considera una forma de "input" del sistema al usuario
  async execute(params: { message: string; markdown?: boolean; showNotification?: boolean; updateUI?: boolean }, context?: ToolExecutionContext) {
    if (!context?.vscodeAPI) { // COMPROBACIÓN CLAVE
      // Aunque showNotification usa vscode.window, executeCommand es más abstracto.
      // Es bueno tener el contexto por si acaso o para consistencia.
      // Si updateUI es true y no hay vscodeAPI, podría ser un problema.
      // Por ahora, lo mantenemos opcional y la herramienta podría funcionar parcialmente.
      // O podríamos hacerlo obligatorio si updateUI es true.
      // Para este caso, si updateUI o showNotification es true, necesitamos vscodeAPI.
      if (params.updateUI || params.showNotification) {
         return { success: false, error: 'VSCode API context not available for respond tool actions (updateUI/showNotification).' };
      }
    }
    const vscodeInstance = context?.vscodeAPI; // Puede ser undefined si solo se devuelve el mensaje

    try {
      const { message, markdown = true, showNotification = false, updateUI = true } = params;

      if (updateUI && vscodeInstance) {
        // Este comando debe ser manejado por el WebviewProvider o el propio webview.
        vscodeInstance.commands.executeCommand('extensionAssistant.updateResponse', {
          message,
          isMarkdown: markdown
        });
      }

      if (showNotification && vscodeInstance) {
        vscodeInstance.window.showInformationMessage(message);
      }

      // La herramienta 'respond' en sí misma siempre tiene éxito si llega aquí,
      // su "resultado" es el mensaje que se debe entregar.
      // El ApplicationLogicService o ReActGraph usarán este 'message'.
      return {
        success: true,
        data: {
          delivered: updateUI || showNotification, // Indica si se intentó alguna acción de UI
          message: message, // Devolver el mensaje para que el llamador lo use
          isMarkdown: markdown
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};