// src/features/tools/definitions/userInterface/sendResponseToUser.ts
import * as vscode from 'vscode';
import { ToolDefinition, ToolResult, ToolExecutionContext } from '../../types';
import { EventType } from '../../../events/eventTypes'; // Ajusta la ruta

export const sendResponseToUser: ToolDefinition = {
  name: 'sendResponseToUser',
  description: 'Sends a message to the user in the chat interface. Can optionally also show a VS Code notification.',
  parameters: {
    message: { type: 'string', description: 'The message to send. Markdown is supported for the chat.', required: true },
    showNotification: { type: 'boolean', description: 'If true, also displays the message as a VS Code information notification.', default: false, required: false },
    notificationType: { type: 'string', enum: ['info', 'warning', 'error'], description: 'Type of VS Code notification if showNotification is true.', default: 'info', required: false }
  },
  async execute(
    params: { message: string; showNotification?: boolean; notificationType?: 'info' | 'warning' | 'error' },
    context?: ToolExecutionContext
  ): Promise<ToolResult> {
    if (!context?.vscodeAPI || !context.dispatcher || !context.chatId) {
      return { success: false, error: 'VSCode API, dispatcher, or chatId not available in context.' };
    }

    const { message, showNotification = false, notificationType = 'info' } = params;

    // Enviar mensaje al chat UI
    context.dispatcher.dispatch(EventType.ASSISTANT_MESSAGE_ADD, {
        chatId: context.chatId,
        message: {
            // id: `msg_${context.chatId}_${Date.now()}`, // La UI o el gestor de chat debería generar el ID
            content: message,
            sender: 'assistant',
            timestamp: Date.now(),
            metadata: { isFinal: true }
        }
    });

    // Mostrar notificación de VS Code si se solicita
    if (showNotification) {
      const messageForNotification = message.replace(/<[^>]*>?/gm, ''); // Simple strip HTML/Markdown for notification
      switch (notificationType) {
        case 'warning':
          context.vscodeAPI.window.showWarningMessage(messageForNotification);
          break;
        case 'error':
          context.vscodeAPI.window.showErrorMessage(messageForNotification);
          break;
        case 'info':
        default:
          context.vscodeAPI.window.showInformationMessage(messageForNotification);
          break;
      }
    }

    return { success: true, data: { messageSentToChat: true, notificationShown: showNotification, contentPreview: message.substring(0, 100) + '...' } };
  }
};