// src/services/ChatService.ts
import * as vscode from 'vscode';
import { IChatRepository } from '../store/interfaces/IChatRepository';
import { ChatRepository } from '../store/repositories/chatRepository';
import { Chat, ChatMessage } from '../store/interfaces/entities';
import { ModelManager } from '../models/config/ModelManager'; // Assuming this exists
import { Orchestrator } from '../orchestrator/orchestrator';
import { GlobalContext, SessionContext, ConversationContext, FlowContext } from '../orchestrator/context';

/**
 * Service for managing conversation interactions and integrating the AI model.
 * This service orchestrates the steps of a chat turn.
 */
export class ChatService {
  private repository: IChatRepository;
  private activeConversations: Map<string, ConversationContext> = new Map();
  private currentChatId: string | null = null;
  private pendingNewChat: boolean = false;

  constructor(
      context: vscode.ExtensionContext,
      private modelManager: ModelManager,
      private orchestrator: Orchestrator,
      private globalContext: GlobalContext,
      private sessionContext: SessionContext
  ) {
    this.repository = new ChatRepository(context);
    // console.log('[ChatService] Initialized'); // Reduced logging
  }

  private getActiveConversationContext(): ConversationContext | null {
      if (!this.currentChatId) return null;
      return this.activeConversations.get(this.currentChatId) || null;
  }

  /**
   * Creates a new conversation (saves to DB)
   */
  public async createConversation(title: string = 'New Conversation'): Promise<Chat> {
    const chat: Chat = {
      id: '',
      title,
      timestamp: Date.now()
    };

    const newChat = await this.repository.create(chat);

    const convContext = new ConversationContext(newChat.id, this.sessionContext, []);
    this.activeConversations.set(newChat.id, convContext);
    this.currentChatId = newChat.id;
    this.pendingNewChat = false;

    console.log(`[ChatService] Created new chat: ${newChat.id}`);

    this.orchestrator.addConversationContext(convContext);

    return newChat;
  }

  /**
   * Prepares the service for a new conversation (doesn't save until first message).
   */
  public prepareNewConversation(): void {
    this.currentChatId = null;
    this.pendingNewChat = true;
    console.log('[ChatService] Prepared for new chat state.');
  }

  /**
   * Gets all conversations (from DB for UI list)
   */
  public async getConversations(): Promise<Chat[]> {
    const chats = await this.repository.findAll();
    // console.log(`[ChatService] Retrieved ${chats.length} chats from DB.`); // Reduced logging
    return chats;
  }

  /**
   * Loads a specific conversation and its messages
   */
  public async loadConversation(chatId: string): Promise<ChatMessage[]> {
    console.log(`[ChatService] Loading chat ${chatId}...`);

    let convContext = this.activeConversations.get(chatId);

    if (!convContext) {
        const chat = await this.repository.findById(chatId);
        if (!chat) {
          const error = new Error(`Conversation with ID ${chatId} not found in DB.`);
          console.error('[ChatService]', error.message);
          throw error;
        }

        const messages = await this.repository.getMessages(chatId);
        console.log(`[ChatService] Loaded chat ${chatId} from DB with ${messages.length} messages.`);

        convContext = new ConversationContext(chatId, this.sessionContext, messages);
        this.activeConversations.set(chatId, convContext);
        this.orchestrator.addConversationContext(convContext);

    } else {
         console.log(`[ChatService] Chat ${chatId} context found in memory.`);
    }

    this.currentChatId = chatId;
    this.pendingNewChat = false;

    return convContext.getHistory();
  }

  /**
   * Updates a conversation's title (in DB)
   */
  public async updateConversationTitle(chatId: string, title: string): Promise<void> {
    // console.log(`[ChatService] Updating title for chat ${chatId} to "${title}" in DB.`); // Reduced logging
    return this.repository.updateTitle(chatId, title);
  }

  /**
   * Deletes a conversation (from DB and memory)
   */
  public async deleteConversation(chatId: string): Promise<void> {
    console.log(`[ChatService] Deleting chat ${chatId}`);
    await this.repository.delete(chatId);

    const convContext = this.activeConversations.get(chatId);
    if (convContext) {
        convContext.dispose();
        this.activeConversations.delete(chatId);
         // console.log(`[ChatService] Chat ${chatId} context removed from memory.`); // Reduced logging
         this.orchestrator.clearConversationContext(chatId);
    }

    if (this.currentChatId === chatId) {
      this.currentChatId = null;
      this.pendingNewChat = true;
      console.log('[ChatService] Deleted active chat, preparing new chat state.');
    }
  }

  /**
   * Gets the current conversation ID
   */
  public getCurrentConversationId(): string | null {
    return this.currentChatId;
  }

  /**
   * Sends a message in the current conversation
   */
  public async sendMessage(text: string, files?: string[]): Promise<ChatMessage> {
    const chatId = await this.ensureChat();
    const convContext = this.activeConversations.get(chatId);

    if (!convContext) {
        throw new Error(`Failed to get ConversationContext for chat ID: ${chatId}`);
    }

    // 1. Save user message to DB and in-memory context
    const userMessage: ChatMessage = {
      id: '',
      chatId,
      content: text,
      sender: 'user',
      timestamp: Date.now(),
      files: files || []
    };
    const savedUserMessage = await this.repository.addMessage(userMessage);
    convContext.addMessage(savedUserMessage);

    // 2. Create FlowContext and add initial user data
    const flowContext = convContext.createFlowContext();
    flowContext.setValue('userMessage', text);
    flowContext.setValue('referencedFiles', files || []);

    // Ensure project info is fetched/available in GlobalContext via SessionContext
    await this.sessionContext.getOrFetchProjectInfo();

    // 3. Process with orchestrator
    const assistantResponseContent = await this.orchestrator.processUserMessage(flowContext);

    // 4. Save and return assistant's response message
    const assistantMessage: ChatMessage = {
      id: '',
      chatId,
      content: typeof assistantResponseContent === 'string' ? assistantResponseContent : JSON.stringify(assistantResponseContent), // Ensure string content
      sender: 'assistant',
      timestamp: Date.now(),
      files: []
    };
    const savedAssistantMessage = await this.repository.addMessage(assistantMessage);
    convContext.addMessage(savedAssistantMessage);

    return savedAssistantMessage;
  }

  private async ensureChat(): Promise<string> {
    if (this.currentChatId && !this.pendingNewChat) {
      // console.log(`[ChatService] Using existing chat ID ${this.currentChatId}`); // Reduced logging
      return this.currentChatId;
    }

    console.log('[ChatService] Creating a new chat.');
    const newChat = await this.createConversation();
    return newChat.id;
  }

   dispose(): void {
        console.log('[ChatService] Disposing.');
        this.activeConversations.forEach(context => context.dispose());
        this.activeConversations.clear();
        this.currentChatId = null;
        this.pendingNewChat = false;
   }
}