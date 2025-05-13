// src/orchestrator/context/interactionContext.ts
import { InputAnalysisResult } from '../execution/types';

interface ChatMessage {
    role?: 'user' | 'assistant';
    content: string;
    timestamp: number;
    sender?: 'user' | 'assistant' | 'system';
    chatId?: string;
    files?: string[];
}

interface InteractionContextState {
    chatId: string;
    chatHistory: ChatMessage[];
    [key: string]: any;
}

/**
 * Manages the state and data for a single conversation turn or session.
 * Accumulates chat history, analysis results, and step execution outcomes.
 */
export class InteractionContext {
    private state: InteractionContextState;

    constructor(chatId: string, initialState: Partial<InteractionContextState> = {}) {
        this.state = {
            chatId: chatId,
            chatHistory: [],
            ...initialState
        };
        if (initialState.chatHistory) {
            this.state.chatHistory = initialState.chatHistory;
        }
    }

    getChatId(): string {
        return this.state.chatId;
    }

    addMessage(role: 'user' | 'assistant', content: string) {
        this.state.chatHistory.push({ role, content, timestamp: Date.now() });
    }

    getHistory(limit?: number): ChatMessage[] {
        const history = [...this.state.chatHistory];
        if (limit !== undefined) {
            return history.slice(-limit);
        }
        return history;
    }

    getHistoryForModel(limit?: number): string {
        return this.getHistory(limit).map(msg => {
            const role = msg.role || (msg.sender === 'system' ? 'assistant' : msg.sender || 'assistant');
            return `${role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
        }).join('\n');
    }

    /**
     * Stores a value in the context state using a specific key.
     * Can be used for step results, temporary data, etc.
     */
    setValue(key: string, value: any) {
        if (['chatId', 'chatHistory'].includes(key)) {
            console.warn(`[Context:${this.state.chatId}] Attempted to overwrite protected key: ${key}`);
            return;
        }
        this.state[key] = value;
    }

    /**
     * Retrieves a value from the context state by key.
     */
    getValue<T = any>(key: string): T | undefined {
        return this.state[key] as T | undefined;
    }

    getAnalysisResult(): InputAnalysisResult | undefined {
        return this.getValue<InputAnalysisResult>('analysisResult');
    }

    getObjective(): string | undefined {
        return this.getAnalysisResult()?.objective;
    }

    getExtractedEntities(): InputAnalysisResult['extractedEntities'] | undefined {
        return this.getAnalysisResult()?.extractedEntities;
    }

    /**
     * Provides a flattened view of the context state suitable for parameter resolution
     * via {{placeholder}} patterns. Excludes complex objects or large data if necessary.
     */
    getResolutionContext(): Record<string, any> {
        const resolutionContextData: Record<string, any> = {};
        for (const key in this.state) {
            if (key !== 'chatHistory' && this.state[key] !== undefined) {
                resolutionContextData[key] = this.state[key];
            }
        }
        resolutionContextData['chatHistoryString'] = this.getHistoryForModel(10);
        return resolutionContextData;
    }

    /**
     * Gets the full internal state. Useful for persistence.
     */
    getState(): InteractionContextState {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Restores the internal state from a saved state object.
     */
    restoreState(state: InteractionContextState) {
        if (state && state.chatId) {
            this.state = state;
        } else {
            console.error("[Context] Failed to restore state: Invalid state object.");
        }
    }
}