import * as vscode from 'vscode';
import { SQLiteStorage } from '../../db/SQLiteStorage';
import { 
  TemporaryMemory, 
  ChatMemory, 
  ProjectMemory,
  ChatMessage,
  Chat,
  ChatSummary,
  ChatsUpdatedCallback,
  ChatLoadedCallback
} from './tools';
import { Agent, ModelResponse, MemoryResponse } from '../../interfaces';

/**
 * MemoryAgent es responsable de gestionar toda la memoria de la extensión.
 * Maneja tanto la memoria persistente (proyecto y chat) como la memoria temporal
 * que solo dura durante un intercambio de mensajes.
 */
export class MemoryAgent implements Agent<ModelResponse, MemoryResponse> {
  public name = 'MemoryAgent';
  
  // Herramientas de memoria
  private temporaryMemory: TemporaryMemory;
  private chatMemory: ChatMemory;
  private projectMemory: ProjectMemory;
  
  // Estado actual
  private currentChatId: string | null = null;
  private messages: ChatMessage[] = [];
  private chatList: ChatSummary[] = [];
  
  // Callbacks
  private onChatListUpdated: ChatsUpdatedCallback | null = null;
  private onChatLoadedCallback: ChatLoadedCallback | null = null;

  constructor(context: vscode.ExtensionContext) {
    const storage = new SQLiteStorage(context);
    
    // Inicializar herramientas de memoria
    this.temporaryMemory = new TemporaryMemory();
    this.chatMemory = new ChatMemory(storage);
    this.projectMemory = new ProjectMemory(storage);
  }

  /**
   * Registra un callback para cuando se actualiza la lista de chats
   * @param callback Función a llamar cuando se actualiza la lista de chats
   */
  public onChatsUpdated(callback: ChatsUpdatedCallback): void {
    this.onChatListUpdated = callback;
  }

  /**
   * Registra un callback para cuando se carga un chat
   * @param callback Función a llamar cuando se carga un chat
   */
  public onChatLoaded(callback: ChatLoadedCallback): void {
    this.onChatLoadedCallback = callback;
  }
  
  /**
   * Configura todos los callbacks necesarios para la comunicación con otros componentes
   * @param notifyUI Función para notificar a la UI
   */
  public setupCallbacks(notifyUI: (response: any) => void): void {
    // Callback para cuando se actualiza la lista de chats
    this.onChatsUpdated((chats) => {
      notifyUI({
        type: 'historyLoaded',
        history: chats
      });
    });
    
    // Callback para cuando se carga un chat
    this.onChatLoaded((chat) => {
      notifyUI({
        type: 'chatLoaded',
        chat
      });
    });
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
   * Debe llamarse después de completar cada intercambio de mensajes
   */
  public clearTemporaryMemory(): void {
    this.temporaryMemory.clear();
  }

  /**
   * Crea un nuevo chat y retorna su ID
   * Si hay un chat actual con mensajes, lo guarda automáticamente
   * @param notifyUI Función opcional para notificar directamente a la UI
   * @returns El ID del nuevo chat
   */
  public async createNewChat(notifyUI?: (response: any) => void): Promise<string> {
    // Guardar el chat actual si tiene mensajes
    await this.saveCurrentChatIfNeeded();
    
    // Generar un ID único para el nuevo chat
    const chatId = this.chatMemory.generateChatId();
    this.currentChatId = chatId;
    this.messages = [];
    
    // Notificar que se ha creado un nuevo chat (con lista de chats actualizada)
    await this.loadChatList();
    
    // Notificar directamente a la UI si se proporciona la función
    if (notifyUI) {
      notifyUI({ type: 'chatCleared' });
    }
    
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
    
    // Intentar guardar el chat después de cada mensaje para evitar pérdida de datos
    try {
      await this.saveCurrentChatIfNeeded();
    } catch (error) {
      console.error('Error al guardar el chat después de añadir mensaje:', error);
    }
  }

  /**
   * Procesa la respuesta del modelo y almacena los mensajes
   * @param modelResponse Respuesta del agente de modelo
   * @returns Respuesta estructurada con los mensajes almacenados
   */
  public async process(modelResponse: ModelResponse): Promise<MemoryResponse> {
    console.log(`${this.name} procesando respuesta del modelo:`, modelResponse.response);
    
    // Extraer el mensaje original del usuario de los metadatos
    const userText = modelResponse.metadata.prompt;
    const assistantText = modelResponse.response;
    
    // Crear mensaje del usuario
    const userMessage: ChatMessage = {
      text: userText,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    // Crear mensaje del asistente
    const assistantMessage: ChatMessage = {
      text: assistantText,
      role: 'assistant',
      timestamp: new Date().toISOString()
    };
    
    // Añadir ambos mensajes al chat actual
    await this.addMessage(userMessage);
    await this.addMessage(assistantMessage);
    
    return {
      userMessage,
      assistantMessage,
      chatId: this.currentChatId,
      metadata: {
        timestamp: new Date().toISOString(),
        modelType: modelResponse.modelType,
        originalModelResponse: modelResponse
      }
    };
  }
  
  /**
   * Método legacy para mantener compatibilidad
   * @deprecated Use process() instead
   */
  public async processMessagePair(
    userText: string, 
    assistantText: string
  ): Promise<{userMessage: ChatMessage, assistantMessage: ChatMessage}> {
    console.log('Método legacy: processMessagePair');
    
    // Crear una respuesta de modelo simulada para pasar a process()
    const modelResponse: ModelResponse = {
      response: assistantText,
      modelType: 'gemini', // Valor predeterminado
      metadata: {
        prompt: userText,
        timestamp: new Date().toISOString()
      }
    };
    
    const memoryResponse = await this.process(modelResponse);
    return {
      userMessage: memoryResponse.userMessage,
      assistantMessage: memoryResponse.assistantMessage
    };
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
    if (!this.currentChatId) {
      console.log('No hay chat actual para guardar');
      return;
    }
    
    // Solo guardar si hay mensajes
    if (this.messages.length === 0) {
      console.log('No hay mensajes para guardar en el chat:', this.currentChatId);
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
      if (this.onChatListUpdated) {
        this.onChatListUpdated(updatedList);
      }
      
      console.log('Chat guardado correctamente:', this.currentChatId);
    } catch (error) {
      console.error('Error al guardar el chat:', error);
      throw error; // Propagar el error para manejarlo en niveles superiores
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
      if (this.onChatListUpdated) {
        this.onChatListUpdated(this.chatList);
      }
      
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
        if (this.onChatLoadedCallback) {
          this.onChatLoadedCallback(chat);
        }
        
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
   * Carga la lista de chats al inicio y asegura que haya un chat actual
   * @param notifyUI Función opcional para notificar a la UI
   */
  public async initialize(notifyUI?: (response: any) => void): Promise<void> {
    console.log('MemoryAgent inicializado');
    await this.loadChatList();
    
    // Asegurar que siempre haya un chat actual válido
    if (!this.currentChatId) {
      // Generar un ID único para el nuevo chat
      this.currentChatId = this.chatMemory.generateChatId();
      this.messages = [];
      console.log('Nuevo chat creado al inicializar:', this.currentChatId);
    }
    
    // Configurar callbacks si se proporciona la función de notificación
    if (notifyUI) {
      this.setupCallbacks(notifyUI);
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
