import { EventBus } from './eventBus';
import { MemoryManager } from './memoryManager';
import { Chat, ChatMessage, ChatSummary } from './memory/types';
import { ChatMemory } from './memory/chatMemory';

/**
 * ChatManager es responsable de gestionar todas las operaciones
 * relacionadas con los chats (crear, cargar, guardar, listar).
 */
export class ChatManager {
  private currentChatId: string | null = null;
  private messages: ChatMessage[] = [];
  private chatList: ChatSummary[] = [];
  private chatMemory: ChatMemory;

  constructor(
    private memoryManager: MemoryManager,
    private eventBus: EventBus
  ) {
    this.chatMemory = new ChatMemory(memoryManager.getStorage());
    this.setupEventListeners();
  }

  /**
   * Configura los listeners de eventos
   */
  private setupEventListeners(): void {
    // Escuchar mensajes para procesarlos y almacenarlos
    this.eventBus.on('message:receive', async (payload) => {
      await this.processMessage(payload);
    });
  }

  /**
   * Procesa un mensaje recibido
   */
  private async processMessage(payload: any): Promise<void> {
    try {
      // Asegurar que tenemos un chat actual
      if (!this.currentChatId) {
        await this.createNewChat();
      }
      
      // Crear mensaje del usuario si existe
      if (payload.userMessage) {
        const userMessage: ChatMessage = {
          text: payload.userMessage,
          role: 'user',
          timestamp: new Date().toISOString()
        };
        await this.addMessage(userMessage);
      }
      
      // Crear mensaje del asistente
      if (payload.message && !payload.isUser) {
        const assistantMessage: ChatMessage = {
          text: payload.message,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          modelType: payload.modelType || 'unknown'
        };
        await this.addMessage(assistantMessage);
      }
    } catch (error) {
      console.error('Error al procesar mensaje:', error);
      await this.eventBus.emit('error', {
        message: `Error al procesar mensaje: ${error instanceof Error ? error.message : 'Error desconocido'}`
      });
    }
  }

  /**
   * Crea un nuevo chat y retorna su ID
   */
  public async createNewChat(): Promise<string> {
    try {
      // Guardar el chat actual antes de crear uno nuevo
      await this.saveCurrentChatIfNeeded();
      
      // Generar un nuevo ID de chat
      this.currentChatId = this.generateChatId();
      this.messages = [];
      
      console.log('Nuevo chat creado:', this.currentChatId);
      
      // Guardar el ID del chat actual como último chat activo
      await this.memoryManager.storeProjectMemory('global', 'last_active_chat', this.currentChatId);
      
      // Notificar que se ha creado un nuevo chat
      await this.eventBus.emit('chat:loaded', { 
        chat: {
          id: this.currentChatId,
          title: `Nuevo chat ${new Date().toLocaleTimeString()}`,
          timestamp: new Date().toISOString(),
          messages: [],
          preview: ''
        }, 
        messagesLoaded: true 
      });
      
      return this.currentChatId;
    } catch (error) {
      console.error('Error al crear nuevo chat:', error);
      throw error;
    }
  }

  /**
   * Añade un mensaje al chat actual
   */
  public async addMessage(message: Partial<ChatMessage>): Promise<void> {
    try {
      if (!this.currentChatId) {
        throw new Error('No hay un chat activo para añadir el mensaje');
      }
      
      // Crear un mensaje completo con los campos requeridos
      const fullMessage: ChatMessage = {
        text: message.text || '',
        role: message.role || 'user',
        timestamp: message.timestamp || new Date().toISOString(),
        modelType: message.modelType
      };
      
      // Añadir el mensaje a la lista en memoria
      this.messages.push(fullMessage);
      
      // Notificar que se ha añadido un mensaje
      await this.eventBus.emit('message:receive', { message: fullMessage });
      
      // Guardar el chat después de añadir el mensaje
      await this.saveCurrentChatIfNeeded();
    } catch (error) {
      console.error('Error al añadir mensaje:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los mensajes del chat actual
   */
  public getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * Guarda el chat actual con sus mensajes si es necesario
   */
  public async saveCurrentChatIfNeeded(): Promise<void> {
    if (!this.currentChatId || this.messages.length === 0) {
      return;
    }
    
    // Generar un título a partir del primer mensaje del usuario
    const firstUserMessage = this.messages.find(m => m.role === 'user');
    const title = firstUserMessage 
      ? firstUserMessage.text.substring(0, 30) + (firstUserMessage.text.length > 30 ? '...' : '')
      : `Chat ${new Date().toLocaleString()}`;
    
    // Crear un objeto de chat con metadatos
    const chat: Chat = {
      id: this.currentChatId,
      title,
      timestamp: new Date().toISOString(),
      messages: this.messages,
      preview: firstUserMessage ? firstUserMessage.text.substring(0, 50) : ''
    };
    
    try {
      // Almacenar el chat en la base de datos
      await this.saveChat(this.currentChatId, chat);
      
      // Actualizar la lista de chats
      const updatedList = await this.updateChatList(chat);
      
      // Actualizar la lista local y notificar
      this.chatList = updatedList;
      await this.eventBus.emit('history:loaded', { history: updatedList });
      
      console.log('Chat guardado correctamente:', this.currentChatId);
    } catch (error) {
      console.error('Error al guardar el chat:', error);
      throw error;
    }
  }

  /**
   * Guarda un chat en la base de datos
   */
  public async saveChat(chatId: string, chat: Chat): Promise<void> {
    return this.chatMemory.saveChat(chatId, chat);
  }

  /**
   * Carga un chat desde la base de datos
   */
  public async loadChat(chatId: string, loadMessages: boolean = true): Promise<Chat | null> {
    try {
      // Guardar el chat actual antes de cargar uno nuevo
      await this.saveCurrentChatIfNeeded();
      
      // Cargar el chat con o sin mensajes según el parámetro
      const chat = await this.chatMemory.loadChat(chatId, loadMessages);
      
      if (chat) {
        this.currentChatId = chatId;
        
        // Actualizar los mensajes en memoria solo si se cargaron
        if (loadMessages && chat.messages) {
          this.messages = chat.messages;
        } else {
          // Si no se cargaron mensajes, mantener un array vacío
          this.messages = [];
        }
        
        // Guardar el ID del chat actual como último chat activo
        await this.memoryManager.storeProjectMemory('global', 'last_active_chat', chatId);
        
        // Notificar que se ha cargado un chat
        await this.eventBus.emit('chat:loaded', { 
          chat,
          messagesLoaded: loadMessages
        });
        
        return chat;
      }
      return null;
    } catch (error) {
      console.error('Error al cargar el chat:', error);
      return null;
    }
  }

  /**
   * Carga solo los mensajes de un chat
   */
  public async loadChatMessages(chatId: string): Promise<ChatMessage[]> {
    return this.chatMemory.loadChatMessages(chatId);
  }

  /**
   * Actualiza la lista de chats
   */
  public async updateChatList(newChat: Chat): Promise<ChatSummary[]> {
    return this.chatMemory.updateChatList(newChat);
  }

  /**
   * Obtiene la lista de todos los chats con metadatos optimizados
   */
  public async getChatList(): Promise<ChatSummary[]> {
    try {
      const chatList = await this.chatMemory.getChatList();
      this.chatList = chatList;
      await this.eventBus.emit('chat:list:loaded', { chatList });
      return chatList;
    } catch (error) {
      console.error('Error al cargar la lista de chats:', error);
      return [];
    }
  }

  /**
   * Genera un ID único para un nuevo chat
   */
  public generateChatId(): string {
    return this.chatMemory.generateChatId();
  }

  /**
   * Inicializa el gestor de chats
   */
  public async initialize(): Promise<void> {
    console.log('ChatManager inicializado');
    
    try {
      // Cargar solo la lista de chats (metadatos) al inicio
      this.chatList = await this.getChatList();
      
      // Intentar cargar el último chat activo o crear uno nuevo
      const lastChatData = await this.memoryManager.getProjectMemory('global', 'last_active_chat');
      const lastChatId = lastChatData?.content;
      
      if (lastChatId) {
        console.log('Cargando último chat activo:', lastChatId);
        await this.loadChat(lastChatId, true);
      } else {
        this.currentChatId = this.generateChatId();
        this.messages = [];
        await this.eventBus.emit('chat:loaded', { chat: null, messagesLoaded: false });
      }
    } catch (error) {
      console.error('Error al inicializar ChatManager:', error);
      this.currentChatId = this.generateChatId();
      this.messages = [];
    }
  }

  /**
   * Limpia los recursos cuando se desactiva la extensión
   */
  public dispose(): void {
    console.log('ChatManager eliminado');
    // Guardar cualquier estado pendiente si es necesario
  }
}
