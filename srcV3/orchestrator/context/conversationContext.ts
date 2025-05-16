// src/orchestrator/context/conversationContext.ts
import { SessionContext } from './sessionContext';
import { ChatMessage } from '../../store/interfaces/entities';
import { FlowContext } from './flowContext';
import { MemoryItem } from '../../store/repositories/MemoryRepository';


interface ConversationContextState {
    chatId: string;
    messages: ChatMessage[];
    summary?: string;
    relevantFiles?: string[];
    analyzedFileInsights?: any;
    retrievedMemory?: MemoryItem[]; // <-- Add field for retrieved memory
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
            summary: undefined,
            relevantFiles: undefined,
            analyzedFileInsights: undefined,
            retrievedMemory: undefined, // <-- Initialize here
        };
        this.sessionContext = sessionContext;
        console.log(`[ConversationContext:${chatId}] Initialized with ${initialMessages.length} messages.`);
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
        console.log(`[ConversationContext:${this.state.chatId}] Added message. Total: ${this.state.messages.length}`);
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
        if (this.currentFlowContext) {
            this.currentFlowContext.dispose();
        }
        // Pass relevant state from ConversationContext to the new FlowContext's initial state
        // FlowContext will read most state via getResolutionContext, but initial state can be useful
        this.currentFlowContext = new FlowContext(this, {
            // Pass state that FlowContext needs to start the turn
            summary: this.state.summary,
            relevantFiles: this.state.relevantFiles,
            analyzedFileInsights: this.state.analyzedFileInsights, // Still pass for initial context
            retrievedMemory: this.state.retrievedMemory, // Still pass for initial context
        });
        console.log(`[ConversationContext:${this.state.chatId}] Created new FlowContext.`);
        return this.currentFlowContext;
    }

    getCurrentFlowContext(): FlowContext | null {
        return this.currentFlowContext;
    }

    getSummary(): string | undefined { return this.state.summary; }
    setSummary(summary: string | undefined): void {
        this.state.summary = summary;
        console.log(`[ConversationContext:${this.state.chatId}] Summary updated.`);
    }

    getRelevantFiles(): string[] | undefined { return this.state.relevantFiles; }
    setRelevantFiles(files: string[] | undefined): void {
        this.state.relevantFiles = files;
        console.log(`[ConversationContext:${this.state.chatId}] Relevant files updated: ${files?.length || 0} files.`);
    }

    getAnalyzedFileInsights(): any | undefined { return this.state.analyzedFileInsights; }
    setAnalyzedFileInsights(insights: any | undefined): void {
        this.state.analyzedFileInsights = insights;
        console.log(`[ConversationContext:${this.state.chatId}] Analyzed file insights updated.`);
    }

    // <-- Add getter and setter for retrievedMemory
    getRetrievedMemory(): MemoryItem[] | undefined { return this.state.retrievedMemory; }
    setRetrievedMemory(memory: MemoryItem[] | undefined): void {
        this.state.retrievedMemory = memory;
        console.log(`[ConversationContext:${this.state.chatId}] Retrieved memory updated: ${memory?.length || 0} items.`);
    }
    // --> End new getters/setters


    dispose(): void {
        if (this.currentFlowContext) {
            this.currentFlowContext.dispose();
        }
        this.currentFlowContext = null;
        this.state.messages = [];
        this.state.summary = undefined;
        this.state.relevantFiles = undefined;
        this.state.analyzedFileInsights = undefined;
        this.state.retrievedMemory = undefined; // <-- Clear on dispose
        console.log(`[ConversationContext:${this.state.chatId}] Disposed.`);
    }
}