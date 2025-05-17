// src/services/ChatService.ts
import * as vscode from 'vscode';
import { IOrchestrator, IAgentOrchestrator } from '../orchestrator/interfaces';
import {  SessionContext, ConversationContext } from '../orchestrator/context';
import { Chat, ChatMessage, MemoryItem } from '../store/interfaces';
import { ChatRepository } from '../store/repositories/ChatRepository';
import { IChatRepository } from '../store/interfaces/index';



const MAX_PLANNING_ATTEMPTS = 3;

/**
 * Service for managing conversation interactions and integrating the AI model.
 * This service orchestrates the steps of a chat turn, including replanning.
 * It interacts with the database, the orchestration layer, and the background agents.
 */
export class ChatService {
  private repository: IChatRepository;
  private activeConversations: Map<string, ConversationContext> = new Map();
  private currentChatId: string | null = null;
  private pendingNewChat: boolean = false; 

 
  private replanRequested: boolean = false;
  private replanReason: string = '';
  private replanNewContextData: any = null;

  constructor(
      context: vscode.ExtensionContext,
     
      private orchestrator: IOrchestrator,

      private sessionContext: SessionContext,
      private agentOrchestratorService: IAgentOrchestrator
  ) {
    this.repository = new ChatRepository(context);
    this.setupAgentOrchestratorListeners();
    console.log('[ChatService] Initialized');
  }

  /**
   * Sets up listeners for events from the AgentOrchestratorService.
   * @private
   */
  private setupAgentOrchestratorListeners(): void {

      const listener = this.agentOrchestratorService.on('replanSuggested', (chatId, reason, newContextData) => {
          
          if (this.currentChatId === chatId) {
              console.log(`[ChatService:${chatId}] Replan suggested by agent orchestrator: ${reason}`);
              this.replanRequested = true;
              this.replanReason = reason;
              this.replanNewContextData = newContextData;
             
          } else {
              console.log(`[ChatService] Replan suggested for inactive chat ${chatId}. Ignoring.`);
          }
      });
      
      const statusListener = this.agentOrchestratorService.on('agentStatusChanged', (chatId, agent, status, task, message) => {
        
      });
     
  }


  /**
   * Gets the ID of the currently active conversation.
   * @returns The current chat ID or null if no chat is active.
   */
  public getCurrentConversationId(): string | null {
    return this.currentChatId;
  }

  /**
   * Creates a new conversation in the database.
   * Also creates a new ConversationContext in memory and sets it as current.
   * @param title The title for the new conversation.
   * @returns The newly created Chat entity.
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
   * Prepares the service for a new conversation.
   * Does not save to DB until the first message is sent.
   */
  public prepareNewConversation(): void {
  
    this.currentChatId = null;
    this.pendingNewChat = true;
    console.log('[ChatService] Prepared for new chat state.');
  }

  /**
   * Gets all conversations from the database, ordered by timestamp.
   * Used for displaying the chat history list in the UI.
   * @returns An array of Chat entities.
   */
  public async getConversations(): Promise<Chat[]> {
    const chats = await this.repository.findAll();
    console.log(`[ChatService] Retrieved ${chats.length} chats from DB.`);
    return chats;
  }

  /**
   * Loads a specific conversation and its messages from the database.
   * Creates or retrieves the ConversationContext in memory and sets it as current.
   * @param chatId The ID of the conversation to load.
   * @returns An array of ChatMessage entities for the loaded conversation.
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
   * Updates a conversation's title in the database.
   * @param chatId The ID of the conversation.
   * @param title The new title.
   */
  public async updateConversationTitle(chatId: string, title: string): Promise<void> {
    console.log(`[ChatService] Updating title for chat ${chatId} to "${title}" in DB.`);
    return this.repository.updateTitle(chatId, title);
  }

  /**
   * Deletes a conversation from the database and removes its context from memory.
   * If the deleted chat was the current one, prepares for a new chat state.
   * @param chatId The ID of the conversation to delete.
   */
  public async deleteConversation(chatId: string): Promise<void> {
    console.log(`[ChatService] Deleting chat ${chatId}`);
    await this.repository.delete(chatId);

  
    const convContext = this.activeConversations.get(chatId);
    if (convContext) {
        convContext.dispose();
        this.activeConversations.delete(chatId);
        console.log(`[ChatService] Chat ${chatId} context removed from memory.`);
       
        this.orchestrator.clearConversationContext(chatId);
    }

  
    if (this.currentChatId === chatId) {
      this.currentChatId = null;
      this.pendingNewChat = true;
      console.log('[ChatService] Deleted active chat, preparing new chat state.');
    }
  }

  /**
   * Ensures that a chat exists and is set as the current one.
   * If no chat is current or a new chat is pending, creates a new one.
   * @returns The ID of the current chat.
   */
  private async ensureChat(): Promise<string> {
    if (this.currentChatId && !this.pendingNewChat) {
      console.log(`[ChatService] Using existing chat ID ${this.currentChatId}`);
      return this.currentChatId;
    }

    console.log('[ChatService] Creating a new chat.');
    const newChat = await this.createConversation();
    return newChat.id;
  }


  /**
   * Sends a message in the current conversation.
   * Manages the planning/replanning loop and interacts with the Orchestrator and background agents.
   * @param text The user's message content.
   * @param files Optional array of file paths referenced by the user.
   * @returns The assistant's final response message.
   */
  public async sendMessage(text: string, files?: string[]): Promise<ChatMessage> {
    const chatId = await this.ensureChat();
    const convContext = this.activeConversations.get(chatId);

    if (!convContext) {
        
        throw new Error(`Failed to get ConversationContext for chat ID: ${chatId} after ensuring chat.`);
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
    convContext.addMessage(savedUserMessage); // Add to in-memory context history

    // 2. Start the planning/replanning loop
    let assistantResponseContent: string | any = "Sorry, I couldn't complete the task.";
    let attempts = 0;
    let planningFinished = false;

 
    this.replanRequested = false;
    this.replanReason = '';
    this.replanNewContextData = null;

    while (!planningFinished && attempts < MAX_PLANNING_ATTEMPTS) {
        attempts++;
        console.log(`[ChatService:${chatId}] Planning attempt ${attempts}/${MAX_PLANNING_ATTEMPTS}.`);

      
        let retrievedMemory: MemoryItem[] = [];
        try {
            // Use the IAgentOrchestrator interface
            retrievedMemory = await this.agentOrchestratorService.getMemoryForTurn(convContext);
          
            convContext.setRetrievedMemory(retrievedMemory);
        } catch (error) {
            console.error('[ChatService] Error retrieving memory for turn:', error);
          
            convContext.setRetrievedMemory(undefined); 
        }
   

        // 3. Create a new FlowContext for this planning attempt
       
        const flowContext = convContext.createFlowContext();
        flowContext.setValue('userMessage', text); 
        flowContext.setValue('referencedFiles', files || []); 

        
        if (attempts > 1 && this.replanRequested) {

             flowContext.setValue('isReplanning', true);
             flowContext.setValue('replanReason', this.replanReason);
             flowContext.setValue('replanData', this.replanNewContextData);
             console.log(`[ChatService:${chatId}] Attempt ${attempts} is a replan. Reason: ${this.replanReason}`);
          
             this.replanRequested = false;
             this.replanReason = '';
             this.replanNewContextData = null;
        } else if (attempts > 1) {
            
             console.warn(`[ChatService:${chatId}] Attempt ${attempts} starting without replan requested. Orchestrator loop may have finished unexpectedly in previous attempt.`);
             planningFinished = true; 
           
             assistantResponseContent = assistantResponseContent === "Sorry, I couldn't complete the task."
                ? `Sorry, the planning process did not finalize with a response after attempt ${attempts-1}.`
                : assistantResponseContent; 
             break; 
        }
       


       
        await this.sessionContext.getOrFetchProjectInfo();

        // 4. Process the turn with the Orchestrator for this planning attempt
  
        try {
           
             assistantResponseContent = await this.orchestrator.processUserMessage(flowContext);

            
             planningFinished = true; 
             console.log(`[ChatService:${chatId}] Planning finished successfully after ${attempts} attempts.`);

        } catch (error: any) {
          
             console.error(`[ChatService:${chatId}] Orchestrator processUserMessage failed during attempt ${attempts}:`, error);
           
             if (this.replanRequested && attempts < MAX_PLANNING_ATTEMPTS) {
                  console.log(`[ChatService:${chatId}] Replan requested during failed attempt ${attempts}. Retrying...`);
            
             } else {
                 
                  console.error(`[ChatService:${chatId}] Planning failed after ${attempts} attempts and no replan requested or max attempts reached.`);
                  planningFinished = true; 
                 
                  assistantResponseContent = `Sorry, an error occurred during the planning process after ${attempts} attempts: ${error.message || String(error)}`;
             }
        }

      
    }

   
    if (!planningFinished) {
         console.warn(`[ChatService:${chatId}] Planning loop exited after ${attempts} attempts without finalizing 'respond'.`);
        
         if (assistantResponseContent === "Sorry, I couldn't complete the task.") {
            
             assistantResponseContent = `Sorry, the planning process could not be finalized after ${MAX_PLANNING_ATTEMPTS} attempts.`;
         }
    }


    // 5. Save and return the assistant's final response message
    const assistantMessage: ChatMessage = {
      id: '', 
      chatId,
      content: typeof assistantResponseContent === 'string' ? assistantResponseContent : JSON.stringify(assistantResponseContent), // Ensure content is string
      sender: 'assistant',
      timestamp: Date.now(),
      files: [] 
    };
    const savedAssistantMessage = await this.repository.addMessage(assistantMessage);
    convContext.addMessage(savedAssistantMessage); // Add to in-memory context history

    // 6. Trigger background processing AFTER the turn is fully complete and messages are saved.
    this.agentOrchestratorService.triggerProcessing(convContext);

    
    return savedAssistantMessage;
  }

   /**
    * Disposes of resources used by the ChatService.
    * Removes event listeners to prevent memory leaks.
    */
   dispose(): void {
        console.log('[ChatService] Disposing.');
       
        if (this.agentOrchestratorService && typeof this.agentOrchestratorService.removeAllListeners === 'function') {
             (this.agentOrchestratorService as any).removeAllListeners('replanSuggested');
             (this.agentOrchestratorService as any).removeAllListeners('agentStatusChanged');
        }


     
        this.activeConversations.forEach(context => context.dispose());
        this.activeConversations.clear();

     
        this.currentChatId = null;
        this.pendingNewChat = false;
        this.replanRequested = false;
        this.replanReason = '';
        this.replanNewContextData = null;

       
   }
}