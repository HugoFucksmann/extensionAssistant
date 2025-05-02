import * as vscode from 'vscode';
import { AppCommands, VS_CODE_PREFIX } from '../../../core/config/constants';
import { UIStateContext } from '../../../core/context/uiStateContext';
import { ChatService } from '../../../services/chatService';
import { ExtensionHandler } from '../../../core/config/extensionHandler';

/**
 * Configura los manejadores de mensajes desde el webview
 */
export function setupMessageHandlers(
  webviewView: vscode.WebviewView,
  uiStateContext: UIStateContext,
  chatService: ChatService
): void {
  // Obtener la instancia de ExtensionContext
  const extensionContext = ExtensionHandler.getInstance();
  
  webviewView.webview.onDidReceiveMessage(async (message) => {
    try {
      console.log('Mensaje recibido del webview:', message);
      
      // Mapa de tipos de mensajes a sus manejadores
      const messageHandlers: Record<string, (data: any) => Promise<void>> = {
        // Comandos nuevos
        [AppCommands.MESSAGE_SEND]: async (data) => {
          console.log('[MessageHandler] Recibido mensaje para procesar:', data.message.substring(0, 50) + '...');
          try {
            // Usar el nuevo MessageProcessor a través de ExtensionContext
            console.log('[MessageHandler] Delegando al processMessage de ExtensionContext...');
            await extensionContext.processMessage(data.message);
            console.log('[MessageHandler] Mensaje procesado correctamente');
          } catch (error) {
            console.error('[MessageHandler] Error al procesar mensaje:', error);
            throw error;
          }
        },
        [AppCommands.CHAT_NEW]: async () => {
          await chatService.createNewChat();
        },
        [AppCommands.CHAT_LOAD]: async (data) => {
          await chatService.loadChat(data.chatId, data.loadMessages !== false);
        },
        [AppCommands.CHAT_LIST_LOAD]: async () => {
          await chatService.getChatList();
        },
        [AppCommands.MODEL_CHANGE]: async (data) => {
          if (data.modelType === 'ollama' || data.modelType === 'gemini') {
            await vscode.commands.executeCommand(`${VS_CODE_PREFIX}${AppCommands.MODEL_CHANGE.split(':').join('.')}`, {
              modelType: data.modelType
            });
          } else {
            throw new Error(`Modelo no soportado: ${data.modelType}`);
          }
        },
        
        // Nombres antiguos para compatibilidad
        'sendMessage': async (data) => {
          console.log('[MessageHandler] Recibido mensaje (formato antiguo) para procesar:', data.message.substring(0, 50) + '...');
          try {
            // Usar el nuevo MessageProcessor a través de ExtensionContext
            console.log('[MessageHandler] Delegando al processMessage de ExtensionContext (desde handler antiguo)...');
            await extensionContext.processMessage(data.message);
            console.log('[MessageHandler] Mensaje procesado correctamente (desde handler antiguo)');
          } catch (error) {
            console.error('[MessageHandler] Error al procesar mensaje (formato antiguo):', error);
            throw error;
          }
        },
        'newChat': async () => {
          await chatService.createNewChat();
        },
        'loadChat': async (data) => {
          await chatService.loadChat(data.chatId, true);
        },
        'loadHistory': async () => {
          await chatService.getChatList();
        },
        'setModel': async (data) => {
          if (data.modelType === 'ollama' || data.modelType === 'gemini') {
            await vscode.commands.executeCommand(`${VS_CODE_PREFIX}${AppCommands.MODEL_CHANGE.split(':').join('.')}`, {
              modelType: data.modelType
            });
          } else {
            throw new Error(`Modelo no soportado: ${data.modelType}`);
          }
        }
      };
      
      // Obtener el comando del mensaje
      const command = message.command || message.type;
      const handler = messageHandlers[command];
      
      if (handler) {
        await handler(message.payload || message);
      } else {
        console.warn('Tipo de mensaje no reconocido:', command);
      }
    } catch (error: any) {
      console.error('Error al procesar mensaje:', error);
      uiStateContext.setState('error', error.message || 'Error desconocido');
    }
  });
}