/**
 * Tipos utilizados en el sistema de memoria
 */

/**
 * Representa un mensaje en un chat
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  modelType?: string; // Tipo de modelo usado para generar la respuesta (solo para mensajes del asistente)
}

/**
 * Representa un chat completo
 */
export interface Chat {
  id: string;
  title: string;
  timestamp: string;
  messages: ChatMessage[];
  preview: string;
}

/**
 * Versión resumida de un chat para la lista
 */
export interface ChatSummary {
  id: string;
  title: string;
  timestamp: string;
  preview: string;
}

/**
 * Callback para notificaciones de actualización de chats
 */
export type ChatsUpdatedCallback = (chats: ChatSummary[]) => void;

/**
 * Callback para notificaciones de carga de chat
 */
export type ChatLoadedCallback = (chat: Chat) => void;
