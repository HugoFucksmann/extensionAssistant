// src/orchestrator/context/conversationContext.ts
import { SessionContext } from './sessionContext';
import { ChatMessage } from '../../storage/interfaces/entities';
import { FlowContext } from './flowContext';

interface ConversationContextState {
    chatId: string;
    // Messages are typically stored in the DB, but we load them into
    // this context object while the conversation is active.
    messages: ChatMessage[];
    // Add other conversation-specific state here (e.g., summary, relevant files list)
    summary?: string;
    relevantFiles?: string[]; // Files explicitly discussed or referenced
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
    private currentFlowContext: FlowContext | null = null; // Context for the active turn/flow

    constructor(chatId: string, sessionContext: SessionContext, initialMessages: ChatMessage[] = []) {
        this.state = {
            chatId: chatId,
            messages: initialMessages,
        };
        this.sessionContext = sessionContext;
        console.log(`[ConversationContext:${chatId}] Initialized with ${initialMessages.length} messages.`);
    }

    getState(): ConversationContextState {
         // Be careful with circular references if FlowContext refers back strongly
         const stateCopy: any = { ...this.state }; // Simple shallow copy
         delete stateCopy.currentFlowContext; // Avoid serializing the active flow context

         // Deep copy messages if they are mutable objects (they are)
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
        console.log(`[ConversationContext:${this.state.chatId}] Added message. Total: ${this.state.messages.length}`);
        // Note: Persistence to DB is handled by ChatService, not here.
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
             // Use sender if available, fallback to role if not, then default to assistant
             const role = msg.sender || msg.role || 'assistant';
             const senderType = role === 'user' ? 'User' : (role === 'assistant' ? 'Assistant' : 'System');
             return `${senderType}: ${msg.content}`;
         }).join('\n');
     }

    /**
     * Creates or gets the active FlowContext for the current turn.
     * A new FlowContext is typically created for each user message processing cycle.
     */
    createFlowContext(): FlowContext {
        // Dispose of the previous flow context if it exists? Depends on flow control.
        // For now, let's assume one active flow context per conversation context.
        // A new one is created for each user input needing orchestration.
        this.currentFlowContext = new FlowContext(this); // Pass parent ConversationContext
        console.log(`[ConversationContext:${this.state.chatId}] Created new FlowContext.`);
        return this.currentFlowContext;
    }

    getCurrentFlowContext(): FlowContext | null {
        return this.currentFlowContext;
    }

    // Add setters/getters for other conversation state (summary, relevantFiles)
    getSummary(): string | undefined {
        return this.state.summary;
    }

    setSummary(summary: string | undefined): void {
        this.state.summary = summary;
    }

    getRelevantFiles(): string[] | undefined {
        return this.state.relevantFiles;
    }

    setRelevantFiles(files: string[] | undefined): void {
        this.state.relevantFiles = files;
    }

    dispose(): void {
        // Clean up any resources
        if (this.currentFlowContext) {
            this.currentFlowContext.dispose();
        }
        this.currentFlowContext = null;
        this.state.messages = []; // Clear messages in memory
        console.log(`[ConversationContext:${this.state.chatId}] Disposed.`);
    }
}