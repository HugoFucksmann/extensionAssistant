import * as vscode from 'vscode';
import { EventBus } from '../../core/eventBus';
import { SQLiteStorage } from '../../db/SQLiteStorage';
import { 
  TemporaryMemory, 
  ChatMemory, 
  ProjectMemory,
  ChatMessage,
  Chat,
  ChatSummary
} from './tools';

/**
 * MemoryAgent es responsable de gestionar toda la memoria de la extensión.
 * Maneja tanto la memoria persistente (proyecto y chat) como la memoria temporal.
 */
export class MemoryAgent {
  public name = 'MemoryAgent';
  
  // Herramientas de memoria
  private temporaryMemory: TemporaryMemory;
  private chatMemory: ChatMemory;
  private projectMemory: ProjectMemory;
  
  // Estado actual
  private currentChatId: string | null = null;
  private messages: ChatMessage[] = [];
  private chatList: ChatSummary[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private eventBus: EventBus
  ) {
    const storage = new SQLiteStorage(context);
    
    // Inicializar herramientas de memoria
    this.temporaryMemory = new TemporaryMemory();
    this.chatMemory = new ChatMemory(storage);
    this.projectMemory = new ProjectMemory(storage);
    
    // Suscribirse a eventos relevantes
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
    
    // Crear nuevo chat
    this.eventBus.on('chat:new', async () => {
      await this.createNewChat();
    });
    
    // Cargar chat existente
    this.eventBus.on('chat:load', async (payload) => {
      await this.loadChat(payload.chatId);
    });
  }

  /**
   * Procesa un mensaje recibido
   * @param payload El payload del mensaje
   */
  private async processMessage(payload: any): Promise<void> {
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
        timestamp: new Date().toISOString()
      };
      await this.addMessage(assistantMessage);
    }
  }

  /**
   * Almacena una memoria para un proyecto específico
   * @param projectPath La ruta del proyecto como identificador
   * @param key La clave bajo la cual almacenar la memoria
   * @param content El contenido a almacenar
   */
  public async storeProjectMemory(projectPath: string, key: string, content: string): Promise<void> {
    return this.projectMemory.storeProjectMemory(projectPath, key, content);
  }

  /**
   * Recupera una memoria para un proyecto específico
   * @param projectPath La ruta del proyecto como identificador
   * @param key La clave para recuperar la memoria
   */
  public async getProjectMemory(projectPath: string, key: string): Promise<any> {
    return this.projectMemory.getProjectMemory(projectPath, key);
  }

  /**
   * Almacena una memoria temporal para el intercambio de mensajes actual
   * @param key La clave bajo la cual almacenar la memoria
   * @param content El contenido a almacenar
   */
  public storeTemporaryMemory(key: string, content: any): void {
    this.temporaryMemory.store(key, content);
  }

  /**
   * Recupera una memoria temporal
   * @param key La clave para recuperar la memoria
   */
  public getTemporaryMemory(key: string): any {
    return this.temporaryMemory.get(key);
  }

  /**
   * Limpia todas las memorias temporales
   */
  public clearTemporaryMemory(): void {
    this.temporaryMemory.clear();
  }

  /**
   * Crea un nuevo chat y retorna su ID
   * @returns El ID del nuevo chat
   */
  public async createNewChat(): Promise<string> {
    // Guardar el chat actual si tiene mensajes
    await this.saveCurrentChatIfNeeded();
    
    // Generar un ID único para el nuevo chat
    const chatId = this.chatMemory.generateChatId();
    this.currentChatId = chatId;
    this.messages = [];
    
    // Crear un objeto de chat vacío pero válido
    const newChat: Chat = {
      id: chatId,
      title: `Nuevo chat ${new Date().toLocaleTimeString()}`,
      timestamp: new Date().toISOString(),
      messages: [],
      preview: ''
    };
    
    // Notificar que se ha creado un nuevo chat
    await this.loadChatList();
    await this.eventBus.emit('chat:loaded', { chat: newChat, type: 'newChat' });
    
    return chatId;
  }

  /**
   * Añade un mensaje al chat actual
   * @param message El mensaje a añadir
   */
  public async addMessage(message: Partial<ChatMessage>): Promise<void> {
    // Asegurar que tenemos un chat actual
    if (!this.currentChatId) {
      await this.createNewChat();
    }
    
    const fullMessage: ChatMessage = {
      ...message as ChatMessage,
      timestamp: new Date().toISOString()
    };
    
    this.messages.push(fullMessage);
    
    // Intentar guardar el chat después de cada mensaje
    try {
      await this.saveCurrentChatIfNeeded();
    } catch (error) {
      console.error('Error al guardar el chat después de añadir mensaje:', error);
    }
  }

  /**
   * Obtiene todos los mensajes del chat actual
   * @returns Los mensajes del chat actual
   */
  public getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * Guarda el chat actual con sus mensajes si es necesario
   * @returns Promise que se resuelve cuando se guarda el chat
   */
  private async saveCurrentChatIfNeeded(): Promise<void> {
    // Verificar que tenemos un ID de chat y al menos un mensaje
    if (!this.currentChatId || this.messages.length === 0) {
      return;
    }
    
    console.log('Guardando chat actual:', this.currentChatId, 'con', this.messages.length, 'mensajes');
    
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
      await this.chatMemory.saveChat(this.currentChatId, chat);
      
      // Actualizar la lista de chats
      const updatedList = await this.chatMemory.updateChatList(chat);
      
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
   * Carga la lista de todos los chats
   * @returns Promise que se resuelve con la lista de chats
   */
  public async loadChatList(): Promise<ChatSummary[]> {
    try {
      this.chatList = await this.chatMemory.getChatList();
      
      // Notificar que la lista de chats ha sido actualizada
      await this.eventBus.emit('history:loaded', { history: this.chatList });
      
      return this.chatList;
    } catch (error) {
      console.error('Error al obtener la lista de chats:', error);
      return [];
    }
  }

  /**
   * Carga un chat por su ID
   * @param chatId El ID del chat a cargar
   * @returns Promise que se resuelve con los datos del chat
   */
  public async loadChat(chatId: string): Promise<Chat | null> {
    try {
      // Guardar el chat actual antes de cargar uno nuevo
      await this.saveCurrentChatIfNeeded();
      
      const chat = await this.chatMemory.loadChat(chatId);
      if (chat) {
        this.currentChatId = chatId;
        this.messages = chat.messages || [];
        
        // Notificar que se ha cargado un chat
        await this.eventBus.emit('chat:loaded', { chat });
        
        return chat;
      }
      return null;
    } catch (error) {
      console.error('Error al cargar el chat:', error);
      return null;
    }
  }

  /**
   * Inicializa el agente de memoria
   */
  public async initialize(): Promise<void> {
    console.log('MemoryAgent inicializado');
    await this.loadChatList();
    
    // Asegurar que siempre haya un chat actual válido
    if (!this.currentChatId) {
      this.currentChatId = this.chatMemory.generateChatId();
      this.messages = [];
    }
  }

  /**
   * Limpia los recursos cuando se desactiva la extensión
   */
  public dispose(): void {
    console.log('MemoryAgent eliminado');
    // Guardar cualquier estado pendiente si es necesario
  }
}