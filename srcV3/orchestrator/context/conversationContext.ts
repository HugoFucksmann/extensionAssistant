// src/orchestrator/context/conversationContext.ts
import { SessionContext } from './sessionContext';
import { ChatMessage } from '../../store/interfaces/entities';
import { FlowContext } from './flowContext';

interface ConversationContextState {
    chatId: string;
    messages: ChatMessage[];
    summary?: string;
    relevantFiles?: string[];
    [key: string]: any;
}

/**
 * Manages context specific to a single chat conversation thread.
 * Contains chat messages and other conversation-specific state.
 * Linked to the SessionContext.
 */
export class ConversationContext {
    private state: ConversationContextState;
    private sessionContext: SessionContext;
    private currentFlowContext: FlowContext | null = null;

    constructor(chatId: string, sessionContext: SessionContext, initialMessages: ChatMessage[] = []) {
        this.state = {
            chatId: chatId,
            messages: initialMessages,
        };
        this.sessionContext = sessionContext;
        // console.log(`[ConversationContext:${chatId}] Initialized with ${initialMessages.length} messages.`); // Reduced logging
    }

    getState(): ConversationContextState {
         const stateCopy: any = { ...this.state };
         delete stateCopy.currentFlowContext;
         stateCopy.messages = this.state.messages.map(msg => ({ ...msg }));
         return stateCopy as ConversationContextState;
     }

    getChatId(): string {
        return this.state.chatId;
    }

    getSessionContext(): SessionContext {
        return this.sessionContext;
    }

    addMessage(message: ChatMessage): void {
        this.state.messages.push(message);
        // console.log(`[ConversationContext:${this.state.chatId}] Added message. Total: ${this.state.messages.length}`); // Reduced logging
    }

    getHistory(limit?: number): ChatMessage[] {
        const history = [...this.state.messages];
        if (limit !== undefined) {
            return history.slice(-limit);
        }
        return history;
    }

     getHistoryForModel(limit?: number): string {
         return this.getHistory(limit).map(msg => {
             const senderType = msg.sender === 'user' ? 'User' : (msg.sender === 'assistant' ? 'Assistant' : 'System');
             return `${senderType}: ${msg.content}`;
         }).join('\n');
     }

    /**
     * Creates or gets the active FlowContext for the current turn.
     */
    createFlowContext(): FlowContext {
        this.currentFlowContext = new FlowContext(this);
        // console.log(`[ConversationContext:${this.state.chatId}] Created new FlowContext.`); // Reduced logging
        return this.currentFlowContext;
    }

    getCurrentFlowContext(): FlowContext | null {
        return this.currentFlowContext;
    }

    getSummary(): string | undefined { return this.state.summary; }
    setSummary(summary: string | undefined): void { this.state.summary = summary; }

    getRelevantFiles(): string[] | undefined { return this.state.relevantFiles; }
    setRelevantFiles(files: string[] | undefined): void { this.state.relevantFiles = files; }

    dispose(): void {
        if (this.currentFlowContext) {
            this.currentFlowContext.dispose();
        }
        this.currentFlowContext = null;
        this.state.messages = [];
        // console.log(`[ConversationContext:${this.state.chatId}] Disposed.`); // Reduced logging
    }
}