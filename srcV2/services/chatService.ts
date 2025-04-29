import { UIStateContext } from '../core/context/uiStateContext';
import { BaseAPI } from '../models/baseAPI';
import { SQLiteStorage } from '../core/storage/db/SQLiteStorage';
import { ChatMemory } from '../core/storage/memory/chatMemory';

/**
 * Interfaces para los tipos de datos
 */
export interface ChatMessage {
  id: string;
  text: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  modelType?: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: string;
  messagesLoaded?: boolean;
  messageCount?: number;
  lastMessageTimestamp?: string;
  lastMessagePreview?: string;
}

/**
 * Servicio que gestiona todas las operaciones relacionadas con chats
 */
export class ChatService {
  private currentChatId: string | null = null;
  private messages: ChatMessage[] = [];
  private chatMemory: ChatMemory;
  
  constructor(
    private storage: SQLiteStorage,
    private uiStateContext: UIStateContext,
    private baseAPI: BaseAPI
  ) {
    this.chatMemory = new ChatMemory(storage);
  }
  
  /**
   * Inicializa el servicio de chat
   */
  async initialize(): Promise<void> {
    try {
      // Cargar lista de chats
      await this.getChatList();
      
      // Intentar cargar el último chat activo
      const lastChatId = await this.storage.getChatMemory('global', 'last_active_chat');
      if (lastChatId?.content) {
        await this.loadChat(lastChatId.content, true);
      }
    } catch (error) {
      console.error('Error al inicializar el servicio de chat:', error);
      this.uiStateContext.setState('error', 'Error al inicializar el chat');
    }
  }
  
  /**
   * Crea un nuevo chat
   */
  async createNewChat(): Promise<string> {
    try {
      const chatId = this.generateChatId();
      this.currentChatId = chatId;
      this.messages = [];
      
      const newChat: Chat = {
        id: chatId,
        title: `Chat ${new Date().toLocaleString()}`,
        messages: [],
        timestamp: new Date().toISOString()
      };
      
      // Guardar el nuevo chat
      await this.chatMemory.saveChat(chatId, newChat);
      
      // Guardar como último chat activo
      await this.storage.storeChatMemory('global', 'last_active_chat', chatId);
      
      // Actualizar la lista de chats
      await this.chatMemory.updateChatList(newChat);
      
      // Actualizar estado de UI
      this.uiStateContext.setState('currentChatId', chatId);
      this.uiStateContext.setState('messages', []);
      
      // Actualizar la lista de chats en la UI
      await this.getChatList();
      
      return chatId;
    } catch (error) {
      console.error('Error al crear un nuevo chat:', error);
      this.uiStateContext.setState('error', 'Error al crear un nuevo chat');
      throw error;
    }
  }
  
  /**
   * Carga un chat existente
   * @param chatId ID del chat a cargar
   * @param loadMessages Si es true, carga también los mensajes del chat
   */
  async loadChat(chatId: string, loadMessages: boolean = true): Promise<Chat | null> {
    try {
      const chat = await this.chatMemory.loadChat(chatId, loadMessages);
      
      if (!chat) {
        console.warn(`Chat ${chatId} no encontrado`);
        this.uiStateContext.setState('error', `Chat no encontrado`);
        return null;
      }
      
      this.currentChatId = chatId;
      
      // Actualizar estado de UI
      this.uiStateContext.setState('currentChatId', chatId);
      
      if (loadMessages) {
        this.messages = chat.messages || [];
        this.uiStateContext.setState('messages', this.messages);
      } else {
        // Si no cargamos los mensajes, solo actualizamos el ID del chat
        // Los mensajes se cargarán bajo demanda cuando se necesiten
        this.messages = [];
        this.uiStateContext.setState('messages', []);
        
        // Indicar que hay mensajes por cargar
        if (chat.messageCount > 0) {
          this.uiStateContext.setState('messagesStatus', {
            loaded: false,
            count: chat.messageCount
          });
        }
      }
      
      // Guardar como último chat activo
      await this.storage.storeChatMemory('global', 'last_active_chat', chatId);
      
      return chat;
    } catch (error) {
      console.error('Error al cargar el chat:', error);
      this.uiStateContext.setState('error', 'Error al cargar el chat');
      return null;
    }
  }
  
  /**
   * Carga los mensajes de un chat bajo demanda
   * @param chatId ID del chat cuyos mensajes se quieren cargar
   */
  async loadChatMessages(chatId: string): Promise<ChatMessage[]> {
    try {
      if (chatId !== this.currentChatId) {
        await this.loadChat(chatId, true);
        return this.messages;
      }
      
      // Si ya tenemos mensajes cargados, no hacemos nada
      if (this.messages.length > 0) {
        return this.messages;
      }
      
      // Cargar los mensajes
      this.messages = await this.chatMemory.loadChatMessages(chatId);
      
      // Actualizar estado de UI
      this.uiStateContext.setState('messages', this.messages);
      this.uiStateContext.setState('messagesStatus', {
        loaded: true,
        count: this.messages.length
      });
      
      return this.messages;
    } catch (error) {
      console.error('Error al cargar los mensajes del chat:', error);
      this.uiStateContext.setState('error', 'Error al cargar los mensajes');
      return [];
    }
  }
  
  /**
   * Procesa un mensaje del usuario
   */
  async processUserMessage(message: string): Promise<string> {
    try {
      // Asegurar que hay un chat activo
      if (!this.currentChatId) {
        await this.createNewChat();
      }
      
      // Generar ID único para el mensaje
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Añadir mensaje del usuario
      const userMessage: ChatMessage = {
        id: messageId,
        text: message,
        role: 'user',
        timestamp: new Date().toISOString()
      };
      this.messages.push(userMessage);
      
      // Actualizar estado de UI
      this.uiStateContext.setState('messages', [...this.messages]);
      this.uiStateContext.setState('isProcessing', true);
      
      try {
        // Generar respuesta
        const response = await this.baseAPI.generateResponse(message);
        
        // Generar ID único para la respuesta
        const responseId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        // Añadir respuesta del asistente
        const assistantMessage: ChatMessage = {
          id: responseId,
          text: response,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          modelType: this.baseAPI.getCurrentModel()
        };
        this.messages.push(assistantMessage);
        
        // Actualizar estado de UI
        this.uiStateContext.setState('messages', [...this.messages]);
        
        // Guardar el chat actualizado
        if (this.currentChatId) {
          const chatToSave: Chat = {
            id: this.currentChatId,
            title: this.generateChatTitle(message),
            messages: this.messages,
            timestamp: new Date().toISOString()
          };
          
          await this.chatMemory.saveChat(this.currentChatId, chatToSave);
          
          // Actualizar la lista de chats
          await this.chatMemory.updateChatList({
            id: this.currentChatId,
            title: chatToSave.title,
            timestamp: chatToSave.timestamp,
            preview: message.substring(0, 50) + (message.length > 50 ? '...' : '')
          });
          
          // Actualizar la lista de chats en la UI
          await this.getChatList();
        }
        
        return response;
      } finally {
        this.uiStateContext.setState('isProcessing', false);
      }
    } catch (error: any) {
      console.error('Error al procesar el mensaje:', error);
      this.uiStateContext.setState('error', error.message || 'Error al procesar el mensaje');
      throw error;
    }
  }
  
  /**
   * Obtiene la lista de chats
   */
  async getChatList(): Promise<Chat[]> {
    try {
      const chatList = await this.chatMemory.getChatList();
      
      // Actualizar estado de UI
      this.uiStateContext.setState('chatList', chatList);
      
      return chatList;
    } catch (error) {
      console.error('Error al obtener la lista de chats:', error);
      this.uiStateContext.setState('error', 'Error al obtener la lista de chats');
      return [];
    }
  }
  
  /**
   * Genera un título para el chat basado en el primer mensaje
   */
  private generateChatTitle(firstMessage: string): string {
    // Usar el inicio del primer mensaje como título
    const maxLength = 30;
    let title = firstMessage.trim().substring(0, maxLength);
    if (firstMessage.length > maxLength) {
      title += '...';
    }
    return title || `Chat ${new Date().toLocaleString()}`;
  }
  
  /**
   * Genera un ID único para un chat
   */
  generateChatId(): string {
    return this.chatMemory.generateChatId();
  }
  
  /**
   * Libera recursos
   */
  dispose(): void {
    // Guardar estado actual si es necesario
    console.log('ChatService: recursos liberados');
  }
}