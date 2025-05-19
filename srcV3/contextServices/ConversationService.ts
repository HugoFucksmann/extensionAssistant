// src/contextServices/ConversationService.ts
// TODO: Implement logic to manage active ConversationContextState instances
import { IConversationContextState } from "../orchestrator/context/conversationContext";
import { ChatMessage } from "../store/interfaces/entities"; // Need ChatMessage type
import { ChatPersistenceService } from "../store/services/ChatPersistenceService"; // Dependency
import { EventEmitterService } from "../events/EventEmitterService"; // Dependency
import { IFlowContextState } from "../orchestrator/context/flowContext"; // Need FlowContextState structure

/**
 * Service to manage the lifecycle and state of active conversations in memory.
 * Coordinates with ChatPersistenceService for loading and saving.
 */
// Implementación de la clase ConversationContextState
class ConversationContextState implements IConversationContextState {
    chatId: string;
    messages: ChatMessage[] = [];
    summary?: string;
    relevantFiles?: string[];
    [key: string]: any;

    constructor(chatId: string, initialMessages: ChatMessage[] = []) {
        this.chatId = chatId;
        this.messages = initialMessages;
    }
}

export class ConversationService {
    // Map from chatId to ConversationContextState instance
    private activeConversations: Map<string, IConversationContextState> = new Map();
    private chatPersistenceService: ChatPersistenceService;
    private eventEmitter: EventEmitterService;


    constructor(chatPersistenceService: ChatPersistenceService, eventEmitter: EventEmitterService) {
        this.chatPersistenceService = chatPersistenceService;
        this.eventEmitter = eventEmitter;
        console.log('[ConversationService] Initialized.');
    }

    /**
     * Creates a new conversation in the database and adds it to active memory.
     */
    async createConversation(title: string = 'New Conversation'): Promise<IConversationContextState> {
        const newChatEntity = await this.chatPersistenceService.createConversation(title);
        const newState = new ConversationContextState(newChatEntity.id); // Create state object
        this.activeConversations.set(newChatEntity.id, newState);
        // No event emission here, ChatPersistenceService already emits 'chatCreated'
        return newState;
    }

    /**
     * Gets an active conversation state from memory. If not in memory, loads it from DB.
     */
    async getConversation(chatId: string): Promise<IConversationContextState | undefined> {
        let conversationState = this.activeConversations.get(chatId);

        if (!conversationState) {
            // Not in memory, load from DB
            // Necesitamos acceder al repositorio directamente ya que no hay un método público para obtener una entidad de chat por ID
            // Idealmente, deberíamos agregar un método getConversation() a ChatPersistenceService
            const chatEntity = await this.chatPersistenceService['chatRepository'].findById(chatId);
            if (!chatEntity) {
                 console.warn(`[ConversationService] Conversation entity not found for ID: ${chatId}`);
                return undefined; // Chat doesn't exist
            }
            const messages = await this.chatPersistenceService.loadConversationMessages(chatId); // Load messages via persistence service

            conversationState = new ConversationContextState(chatId, messages); // Create state object from loaded data
            this.activeConversations.set(chatId, conversationState); // Add to active memory
             console.log(`[ConversationService] Loaded chat ${chatId} into memory with ${messages.length} messages.`);
        } else {
             console.debug(`[ConversationService] Chat ${chatId} state found in memory.`);
        }

        return conversationState;
    }

    /**
     * Adds a message to the conversation state in memory and persists it.
     */
    async addMessageToConversationState(chatId: string, message: ChatMessage): Promise<ChatMessage> {
         const conversationState = await this.getConversation(chatId); // Ensure conversation is loaded
         if (!conversationState) {
              throw new Error(`Conversation with ID ${chatId} not found or could not be loaded.`);
         }

         // Add to in-memory state
         conversationState.messages.push(message);

         // Persist the message via persistence service (this also updates timestamp/preview and emits events)
         const savedMessage = await this.chatPersistenceService.addMessageToConversation(message);

         // Return the message with the final ID from persistence
         return savedMessage;
    }


    /**
     * Deletes a conversation from memory and persistence.
     */
    async deleteConversation(chatId: string): Promise<void> {
        if (this.activeConversations.has(chatId)) {
             // Dispose the in-memory state if it had resources (though our State classes are light now)
             // const state = this.activeConversations.get(chatId); state.dispose(); // If state had dispose
            this.activeConversations.delete(chatId);
            console.log(`[ConversationService] Removed chat ${chatId} state from memory.`);
        }
        await this.chatPersistenceService.deleteConversation(chatId); // Persistence service handles DB deletion and event
    }

     /**
      * Gets the formatted chat history string for a conversation.
      * This logic could live here or in a dedicated formatting utility.
      * For now, keep it here as it operates on the in-memory state.
      */
     getChatHistoryForModel(chatId: string, limit?: number): string | undefined {
         const conversationState = this.activeConversations.get(chatId);
         if (!conversationState) {
             console.warn(`[ConversationService] Cannot get history for unknown chat ID: ${chatId}`);
             return undefined;
         }

         const history = [...conversationState.messages];
         const relevantHistory = limit !== undefined ? history.slice(-limit) : history;

          return relevantHistory.map(msg => {
             // Use the role if available, fallback to sender
             const senderType = msg.role || msg.sender;
             return `${senderType.charAt(0).toUpperCase() + senderType.slice(1)}: ${msg.content}`;
         }).join('\n');
     }

    /**
     * Clears a conversation state from active memory (e.g., when switching chats).
     * Does NOT delete from persistence.
     */
    clearConversationFromMemory(chatId: string): void {
         if (this.activeConversations.has(chatId)) {
             // Dispose the in-memory state if needed
             this.activeConversations.delete(chatId);
              console.log(`[ConversationService] Cleared chat ${chatId} state from memory.`);
         }
    }


    dispose(): void {
        // Dispose all active conversation states if they had resources (not needed for current state classes)
        // this.activeConversations.forEach(state => state.dispose());
        this.activeConversations.clear();
        console.log('[ConversationService] Disposed.');
    }
}