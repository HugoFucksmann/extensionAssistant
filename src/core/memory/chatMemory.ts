import { SQLiteStorage } from '../../db/SQLiteStorage';

/**
 * Herramienta para gestionar la memoria de chats
 */
export class ChatMemory {
  constructor(private storage: SQLiteStorage) {}

  /**
   * Guarda un chat en la base de datos
   * @param chatId ID del chat
   * @param chat Objeto de chat a guardar
   */
  public async saveChat(chatId: string, chat: any): Promise<void> {
    try {
      await this.storage.storeChatMemory(chatId, 'chat_data', JSON.stringify(chat));
      console.log('Chat guardado correctamente:', chatId);
    } catch (error) {
      console.error('Error al guardar el chat:', error);
      throw error;
    }
  }

  /**
   * Carga un chat desde la base de datos
   * @param chatId ID del chat a cargar
   * @param loadMessages Si es true, carga también los mensajes del chat
   * @returns El chat cargado o null si no existe
   */
  public async loadChat(chatId: string, loadMessages: boolean = true): Promise<any> {
    try {
      const chatData = await this.storage.getChatMemory(chatId, 'chat_data');
      if (!chatData?.content) return null;
      
      const chat = JSON.parse(chatData.content);
      
      // Agregar metadatos básicos independientemente del modo de carga
      chat.messageCount = chat.messages?.length || 0;
      chat.messagesLoaded = loadMessages;
      
      // Si no se requieren los mensajes, solo devolver metadatos
      if (!loadMessages && chat.messages?.length) {
        // Si hay mensajes, guardar información sobre el último mensaje
        const lastMessage = chat.messages[chat.messages.length - 1];
        chat.lastMessageTimestamp = lastMessage.timestamp;
        chat.lastMessagePreview = lastMessage.text.substring(0, 50) + 
          (lastMessage.text.length > 50 ? '...' : '');
        
        // Vaciar los mensajes para ahorrar memoria
        chat.messages = [];
      }
      
      return chat;
    } catch (error) {
      console.error('Error al cargar el chat:', error);
      return null;
    }
  }
  
  /**
   * Carga solo los mensajes de un chat
   * @param chatId ID del chat cuyos mensajes se quieren cargar
   * @returns Array de mensajes del chat
   */
  public async loadChatMessages(chatId: string): Promise<any[]> {
    try {
      const chatData = await this.storage.getChatMemory(chatId, 'chat_data');
      if (chatData && chatData.content) {
        const chat = JSON.parse(chatData.content);
        return chat.messages || [];
      }
      return [];
    } catch (error) {
      console.error('Error al cargar los mensajes del chat:', error);
      return [];
    }
  }

  /**
   * Actualiza la lista de chats
   * @param newChat El nuevo chat a añadir a la lista
   * @returns La lista actualizada de chats
   */
  public async updateChatList(newChat: any): Promise<any[]> {
    try {
      // Obtener la lista actual de chats
      const chatList = await this.getChatList();
      
      // Crear una versión simplificada del chat para la lista
      const chatSummary = {
        id: newChat.id,
        title: newChat.title,
        timestamp: newChat.timestamp,
        preview: newChat.preview
      };
      
      // Comprobar si este chat ya existe en la lista
      const existingIndex = chatList.findIndex((chat: any) => chat.id === chatSummary.id);
      if (existingIndex >= 0) {
        // Actualizar chat existente
        chatList[existingIndex] = chatSummary;
      } else {
        // Añadir nuevo chat
        chatList.push(chatSummary);
      }
      
      // Guardar la lista actualizada
      await this.storage.storeChatMemory('global', 'chat_list', JSON.stringify(chatList));
      
      return chatList;
    } catch (error) {
      console.error('Error al actualizar la lista de chats:', error);
      return [];
    }
  }

  /**
   * Obtiene la lista de todos los chats con metadatos optimizados
   * @returns La lista de chats
   */
  public async getChatList(): Promise<any[]> {
    try {
      const chatListData = await this.storage.getChatMemory('global', 'chat_list');
      if (chatListData && chatListData.content) {
        const chatList = JSON.parse(chatListData.content);
        
        // Asegurar que solo devolvemos los metadatos necesarios
        return chatList.map((chat: any) => ({
          id: chat.id,
          title: chat.title,
          timestamp: chat.timestamp,
          preview: chat.preview || '',
          messageCount: chat.messageCount || 0,
          lastMessageTimestamp: chat.lastMessageTimestamp || chat.timestamp,
          lastMessagePreview: chat.lastMessagePreview || ''
        }));
      }
      return [];
    } catch (error) {
      console.error('Error al obtener la lista de chats:', error);
      return [];
    }
  }

  /**
   * Genera un ID único para un nuevo chat
   * @returns ID único para el chat
   */
  public generateChatId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
