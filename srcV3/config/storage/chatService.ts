// src/services/ChatService.ts
import * as vscode from 'vscode';
import { Chat, ChatStorage, ChatMessage } from './chatStorage';

/**
 * Service class for managing chat operations
 */
export class ChatService {
  private storage: ChatStorage;
  private currentChatId: string | null = null;
  private pendingNewChat: boolean = false;
  
  constructor(context: vscode.ExtensionContext) {
    this.storage = new ChatStorage(context);
  }
  
  /**
   * Creates a new chat
   * @param title Initial chat title
   * @returns New chat
   */
  public async createChat(title: string = 'New Chat'): Promise<Chat> {
    const chat = await this.storage.createChat(title);
    this.currentChatId = chat.id;
    return chat;
  }
  
  /**
   * Prepares a new chat without saving it to storage
   */
  public prepareNewChat(): void {
    this.currentChatId = null;
    this.pendingNewChat = true;
  }
  
  /**
   * Gets all chats for display in the UI
   * @returns List of all chats
   */
  public async getChats(): Promise<Chat[]> {
    return this.storage.getAllChats();
  }
  
  /**
   * Loads a specific chat
   * @param chatId Chat ID to load
   * @returns Chat messages
   */
  public async loadChat(chatId: string): Promise<ChatMessage[]> {
    const chat = await this.storage.getChat(chatId);
    if (!chat) {
      throw new Error(`Chat with ID ${chatId} not found`);
    }
    
    this.currentChatId = chatId;
    this.pendingNewChat = false;
    return this.storage.getChatMessages(chatId);
  }
  
  /**
   * Sends a user message to the current chat
   * @param content Message content
   * @returns Added message
   */
  public async sendUserMessage(content: string): Promise<ChatMessage> {
    if (!this.currentChatId || this.pendingNewChat) {
      // Create a new chat only when the first message is sent
      const chat = await this.createChat();
      this.currentChatId = chat.id;
      this.pendingNewChat = false;
    }
    
    const message: ChatMessage = {
      chatId: this.currentChatId,
      content,
      sender: 'user',
      timestamp: Date.now()
    };
    
    return this.storage.addMessage(message);
  }
  
  /**
   * Adds an assistant response to the current chat
   * @param content Message content
   * @returns Added message
   */
  public async addAssistantResponse(content: string): Promise<ChatMessage> {
    if (!this.currentChatId) {
      throw new Error('No active chat to add response to');
    }
    
    const message: ChatMessage = {
      chatId: this.currentChatId,
      content,
      sender: 'assistant',
      timestamp: Date.now()
    };
    
    return this.storage.addMessage(message);
  }
  
  /**
   * Adds a system message to the current chat
   * @param content Message content
   * @returns Added message
   */
  public async addSystemMessage(content: string): Promise<ChatMessage> {
    if (!this.currentChatId) {
      throw new Error('No active chat to add system message to');
    }
    
    const message: ChatMessage = {
      chatId: this.currentChatId,
      content,
      sender: 'system',
      timestamp: Date.now()
    };
    
    return this.storage.addMessage(message);
  }
  
  /**
   * Updates a chat's title
   * @param chatId Chat ID
   * @param title New title
   */
  public async updateChatTitle(chatId: string, title: string): Promise<void> {
    return this.storage.updateChatTitle(chatId, title);
  }
  
  /**
   * Deletes a chat
   * @param chatId Chat ID
   */
  public async deleteChat(chatId: string): Promise<void> {
    if (this.currentChatId === chatId) {
      this.currentChatId = null;
    }
    return this.storage.deleteChat(chatId);
  }
  
  /**
   * Gets the current chat ID
   * @returns Current chat ID or null if no chat is active
   */
  public getCurrentChatId(): string | null {
    return this.currentChatId;
  }
  
  /**
   * Checks if there's a pending new chat
   * @returns True if a new chat is pending
   */
  public isPendingNewChat(): boolean {
    return this.pendingNewChat;
  }
  
  /**
   * Cleans up resources
   */
  public dispose(): void {
    this.storage.close();
  }
}