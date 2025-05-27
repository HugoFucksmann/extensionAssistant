// src/features/tools/definitions/userInterface/sendResponseToUser.ts
import * as vscode from 'vscode';
import { z } from 'zod';
import { ToolDefinition, ToolResult, ToolExecutionContext, ToolPermission } from '../../types';
import { EventType } from '../../../events/eventTypes'; // Asumiendo que tienes un evento para añadir mensajes del asistente
import { ChatMessage } from '../../../../shared/types'; // Asumiendo que ChatMessage está aquí

// Esquema Zod para los parámetros
export const sendResponseToUserParamsSchema = z.object({
  message: z.string().min(1, { message: "Message content cannot be empty." }).describe("The message to send to the user in the chat. Markdown is supported."),
  showNotification: z.boolean().optional().default(false).describe("If true, also displays the message as a VS Code information notification."),
  notificationType: z.enum(['info', 'warning', 'error']).optional().default('info').describe("Type of VS Code notification if showNotification is true. Defaults to 'info'.")
}).strict();

type SendResponseResultData = {
  messageSentToChat: boolean;
  notificationShown: boolean;
  contentPreview: string;
};

export const sendResponseToUser: ToolDefinition<typeof sendResponseToUserParamsSchema, SendResponseResultData> = {
  name: 'sendResponseToUser',
  description: 'Sends a message to the user in the chat interface. This is typically used for final answers or important status updates from the AI. Can optionally also show a VS Code notification.',
  parametersSchema: sendResponseToUserParamsSchema,
  requiredPermissions: [], // No requiere permisos especiales más allá de la interacción básica con la UI
  async execute(
    params, // Tipado por Zod
    context
  ): Promise<ToolResult<SendResponseResultData>> {
    const { message, showNotification, notificationType } = params;

    if (!context.chatId) {
        return { success: false, error: 'ChatId is missing in context, cannot send response to user.' };
    }

    // Asumiendo que tienes un tipo de evento para añadir mensajes del asistente al chat
    // y que tu UI escucha este evento.
    // El ID del mensaje debería ser generado por el sistema que gestiona el chat (ej. ChatService o la UI misma al recibirlo).
    const chatMessagePayload: Partial<ChatMessage> & { content: string, sender: 'assistant', chatId: string, metadata?: any } = { // Ajusta según tu ChatMessage y EventPayload
        chatId: context.chatId,
        content: message,
        sender: 'assistant', // O el rol que uses para el AI
        timestamp: Date.now(),
        metadata: { isFinalToolResponse: true, toolName: 'sendResponseToUser' } // Marcar que es una respuesta final de una herramienta
    };

    // Este evento debería ser manejado por el sistema de chat para añadir el mensaje a la UI.
    // El nombre del evento puede variar según tu implementación.
    // Por ejemplo, podría ser 'ASSISTANT_MESSAGE_ADD' o 'CHAT_MESSAGE_CREATE'.
    // Aquí usaré un nombre genérico, ajústalo a tu `EventType`.
    // Si no tienes un evento específico, podrías necesitar un servicio de Chat al que llamar.
    // Por ahora, asumiré un evento genérico 'ADD_MESSAGE_TO_CHAT_UI'.
    // context.dispatcher.dispatch(EventType.ADD_MESSAGE_TO_CHAT_UI, chatMessagePayload);
    // **REEMPLAZAR con tu evento real o llamada a servicio de chat**
    // Ejemplo si tu EventType.ASSISTANT_MESSAGE_ADD existe y tiene un payload adecuado:
     context.dispatcher.dispatch(EventType.RESPONSE_GENERATED, { // O un evento más específico como ASSISTANT_CHAT_MESSAGE
         chatId: context.chatId,
         responseContent: message,
         isFinal: true, // Asumimos que esta herramienta envía respuestas finales
         source: 'sendResponseToUserTool',
         // metadata: chatMessagePayload.metadata // Si tu payload de RESPONSE_GENERATED lo permite
     });


    if (showNotification) {
      // Strip simple Markdown/HTML for notification to avoid rendering issues
      const plainMessage = message.replace(/[`*_{}[\]()#+\-.!]/g, '').replace(/<[^>]*>?/gm, '');
      const notificationMessage = plainMessage.length > 150 ? plainMessage.substring(0, 147) + "..." : plainMessage;

      switch (notificationType) {
        case 'warning':
          context.vscodeAPI.window.showWarningMessage(notificationMessage);
          break;
        case 'error':
          context.vscodeAPI.window.showErrorMessage(notificationMessage);
          break;
        case 'info':
        default:
          context.vscodeAPI.window.showInformationMessage(notificationMessage);
          break;
      }
    }

    return {
      success: true,
      data: {
        messageSentToChat: true, // Asumimos que el evento se despachó correctamente
        notificationShown: showNotification || false,
        contentPreview: message.substring(0, 100) + (message.length > 100 ? '...' : '')
      }
    };
  }
};