import { WebviewMessage } from '../../ui/types/WebviewTypes';
import { ChatService } from '../../core/ChatService';
import { EventBus } from '../../features/events/EventBus';
import { SessionManager } from '@vscode/webView/SessionManager';

export class ChatHandler {
    private eventBus: EventBus;
    private disposed: boolean = false;

    constructor(
        private postMessage: (type: string, payload: any) => void,
        private chatService: ChatService,
        private sessionManager: SessionManager
    ) {
        this.eventBus = EventBus.getInstance();
    }

    private async validateChatId(uiChatId: string): Promise<string | undefined> {
        if (!uiChatId) {
            this.postMessage('extension:systemError', { 
                message: 'Chat ID is required to send a message.', 
                source: 'ChatHandler' 
            });
            return undefined;
        }

        this.sessionManager.setActiveChatId(uiChatId);
        const currentChatId = this.sessionManager.getCurrentChatId();

        if (!currentChatId || !this.sessionManager.isActive() || currentChatId !== uiChatId) {
            const errorMsg = `Chat session not active or Chat ID mismatch. UI: ${uiChatId}, Backend: ${currentChatId}`;
            this.postMessage('extension:systemError', { 
                message: errorMsg, 
                source: 'ChatHandler', 
                chatId: currentChatId 
            });
            return undefined;
        }

        return currentChatId;
    }

    public async handleUserMessage(message: WebviewMessage): Promise<void> {
        if (this.disposed) return;

        const { payload } = message;
        const text = payload.text as string;
        const files = payload.files as string[];
        const uiChatId = payload.chatId as string;

        const currentChatId = await this.validateChatId(uiChatId);
        if (!currentChatId) return;

        if (!text?.trim() && (!files || files.length === 0)) {
            this.postMessage('extension:systemError', { 
                message: 'Message cannot be empty.', 
                source: 'ChatHandler', 
                chatId: currentChatId 
            });
            return;
        }

        this.postMessage('extension:processingUpdate', {
            type: 'SET_PHASE',
            payload: 'processing_message',
            chatId: currentChatId
        });

        const contextData = {
            files: files || [],
            editorContext: await this.getEditorContext()
        };

        await this.chatService.processUserMessage(currentChatId, text, contextData);
    }

    public handleNewChat(): Promise<void> {
        if (this.disposed) return Promise.resolve();

        const newChatId = this.sessionManager.startNewChat();
        this.postMessage('extension:newChatStarted', { chatId: newChatId, messages: [] });
        this.eventBus.info('New chat started by UI request', { chatId: newChatId }, 'ChatHandler');
        return Promise.resolve();
    }

    public async handleLoadChat(message: WebviewMessage): Promise<void> {
        if (this.disposed) return;

        const { payload } = message;
        const chatId = payload.chatId as string;

        if (!chatId) {
            this.postMessage('extension:systemError', { 
                message: 'Cannot load chat: Chat ID is missing.', 
                source: 'ChatHandler' 
            });
            return;
        }

        this.sessionManager.setActiveChatId(chatId);

        const state = this.chatService.getChatStateManager().getConversationState(chatId);
        if (!state) {
            this.postMessage('extension:systemError', { 
                message: `Chat ${chatId} not found.`, 
                source: 'ChatHandler', 
                chatId 
            });
            return;
        }

        const messages = state.history?.filter(h =>
            h.phase === 'user_input' || (h.phase === 'action' && h.sender === 'assistant')
        ).map(h => ({
            id: h.id,
            content: h.content,
            sender: h.sender,
            timestamp: h.timestamp,
            metadata: h.metadata || {}
        })) || [];

        this.postMessage('extension:chatLoaded', { chatId, messages });
        this.eventBus.info('Chat loaded by UI request', { chatId, messageCount: messages.length }, 'ChatHandler');
    }

    public handleClearChat(message: WebviewMessage): Promise<void> {
        if (this.disposed) return Promise.resolve();

        const { payload } = message;
        const chatId = payload.chatId as string;
        const targetChatId = chatId || this.sessionManager.getCurrentChatId();

        if (!targetChatId) {
            this.postMessage('extension:systemError', { 
                message: 'Cannot clear chat: Chat ID is unknown.', 
                source: 'ChatHandler'
            });
            this.eventBus.warn('Clear chat requested without a target Chat ID.', {}, 'ChatHandler');
            return Promise.resolve();
        }

        this.chatService.clearConversation(targetChatId);
        this.postMessage('extension:chatCleared', { chatId: targetChatId });
        this.eventBus.info('Chat cleared by UI request', { chatId: targetChatId }, 'ChatHandler');
        return Promise.resolve();
    }

    private async getEditorContext(): Promise<any> {
        // Implement editor context retrieval
        return {};
    }

    public dispose(): void {
        this.disposed = true;
    }
}
