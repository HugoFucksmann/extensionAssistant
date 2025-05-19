// src/services/ChatInteractor.ts

import { ConversationManager } from "./ConversationManager"; // Dependency
import { ChatPersistenceService } from "../store/services/ChatPersistenceService"; // Dependency for history/listing
import { Chat, ChatMessage } from "../store/interfaces/entities"; // Need types
import { EventEmitterService } from "../events/EventEmitterService"; // Depend on EventEmitterService for UI events? Or UIBridge listens directly? UIBridge should listen.

/**
 * Interactor layer for the UI. Provides a simple facade over ConversationManager
 * and other services to handle UI-driven chat actions.
 * It does NOT contain core business logic itself.
 */
export class ChatInteractor {
    private conversationManager: ConversationManager;
    private chatPersistenceService: ChatPersistenceService;
    // No direct dependency on EventEmitterService here, UIBridge listens to events
    // emitted by PersistenceService, etc.

    constructor(
        conversationManager: ConversationManager,
        chatPersistenceService: ChatPersistenceService
    ) {
        this.conversationManager = conversationManager;
        this.chatPersistenceService = chatPersistenceService;
        console.log('[ChatInteractor] Initialized.');
    }

    /**
     * Sends a message from the user.
     * Delegates to ConversationManager to handle the full turn.
     * @param chatId The ID of the current chat, or null for a new chat.
     * @param text The user's message content.
     * @param files Files referenced by the user.
     * @returns Promise resolving when the turn is complete (including assistant response).
     */
    async sendUserMessage(chatId: string | null, text: string, files?: string[]): Promise<ChatMessage> {
        // ChatManager handles the full turn flow including persistence
        return this.conversationManager.sendMessage(chatId, text, files);
    }

    /**
     * Prepares for a new conversation on the next message.
     * Delegates to ConversationManager.
     */
    prepareNewConversation(): void {
        this.conversationManager.prepareNewConversation();
         // UIBridge will listen to 'newChat' event if ConversationManager/ChatPersistenceService
         // or ConversationService emits it, or ChatInteractor could emit one itself.
         // Let's stick to Persistence/Service layer events. UIBridge will update based on chat list changes.
    }

    /**
     * Gets the list of all conversations for displaying history.
     * Delegates to ChatPersistenceService.
     */
    async getChatList(): Promise<Chat[]> {
        return this.chatPersistenceService.getConversations();
    }

    /**
     * Loads a specific conversation's messages.
     * Delegates to ConversationManager (which uses ConversationService).
     */
    async loadConversation(chatId: string): Promise<ChatMessage[]> {
        return this.conversationManager.loadConversation(chatId);
    }

    /**
     * Gets the ID of the currently active chat.
     * Delegates to ConversationManager.
     */
    getActiveChatId(): string | null {
        return this.conversationManager.getActiveChatId();
    }

     /**
      * Deletes a conversation.
      * Delegates to ConversationManager (which uses ConversationService).
      */
     async deleteConversation(chatId: string): Promise<void> {
         await this.conversationManager.deleteConversation(chatId);
         // UIBridge will listen to 'chatDeleted' and 'chatMetadataUpdated' (implicitly for new chat) events
     }

     /**
      * Updates a conversation's title.
      * Delegates to ChatPersistenceService.
      */
     async updateConversationTitle(chatId: string, title: string): Promise<void> {
         await this.chatPersistenceService.updateConversationTitle(chatId, title);
         // UIBridge will listen to 'chatTitleUpdated' event
     }


    dispose(): void {
        // Services it depends on are disposed by the ServiceFactory
        console.log('[ChatInteractor] Disposed.');
    }
}