// src/orchestrator/context/interactionContext.ts

import { InputAnalysisResult } from '../execution/types'; // Importa el tipo de análisis

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

// Define la forma del estado interno del contexto
interface InteractionContextState {
    chatId: string;
    chatHistory: ChatMessage[];
    // Almacenamiento genérico para resultados de pasos, contexto de código, etc.
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
            chatHistory: [], // Initialize chat history even if initialState is provided
            ...initialState
        };
         if (initialState.chatHistory) { // Ensure history from state is used if present
             this.state.chatHistory = initialState.chatHistory;
         }
    }

    getChatId(): string {
        return this.state.chatId;
    }

    addMessage(role: 'user' | 'assistant', content: string) {
        this.state.chatHistory.push({ role, content, timestamp: Date.now() });
        // Optional: Trim chat history if too long
        // if (this.state.chatHistory.length > 100) {
        //     this.state.chatHistory = this.state.chatHistory.slice(-100);
        // }
    }

    getHistory(limit?: number): ChatMessage[] {
         const history = [...this.state.chatHistory]; // Return a copy
         if (limit !== undefined) {
             return history.slice(-limit);
         }
         return history;
    }

    getHistoryForModel(limit?: number): string {
        return this.getHistory(limit).map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
    }

    /**
     * Stores a value in the context state using a specific key.
     * Can be used for step results, temporary data, etc.
     */
    setValue(key: string, value: any) {
        // Prevent overwriting chat history or other core properties unintentionally
        if (['chatId', 'chatHistory'].includes(key)) {
            console.warn(`[Context:${this.state.chatId}] Attempted to overwrite protected key: ${key}`);
            return;
        }
        this.state[key] = value;
         // console.log(`[Context:${this.state.chatId}] Stored '${key}'`, value); // Detailed logging can be noisy
    }

    /**
     * Retrieves a value from the context state by key.
     */
    getValue<T = any>(key: string): T | undefined {
        return this.state[key] as T | undefined;
    }

    // Convenience methods for well-known keys
    getAnalysisResult(): InputAnalysisResult | undefined {
        return this.getValue<InputAnalysisResult>('analysisResult');
    }

     // Shortcut to get objective from analysis
    getObjective(): string | undefined {
        return this.getAnalysisResult()?.objective;
    }

    // Shortcut to get entities from analysis
    getExtractedEntities(): InputAnalysisResult['extractedEntities'] | undefined {
        return this.getAnalysisResult()?.extractedEntities;
    }

    /**
     * Provides a flattened view of the context state suitable for parameter resolution
     * via {{placeholder}} patterns. Excludes complex objects or large data if necessary.
     */
    getResolutionContext(): Record<string, any> {
        // For simplicity, return a flattened copy of the state.
        // In complex scenarios, you might curate this object.
        const resolutionContextData: Record<string, any> = {};
         for (const key in this.state) {
             if (key !== 'chatHistory' && this.state[key] !== undefined) { // Exclude history, include only defined values
                 // Basic flattening/shallow copy. Deep copy might be needed for complex objects.
                 resolutionContextData[key] = this.state[key];
             }
         }
         // Add history separately if needed for resolution context, maybe as a string
         resolutionContextData['chatHistoryString'] = this.getHistoryForModel(10); // Make recent history available

        return resolutionContextData;
    }

    /**
     * Gets the full internal state. Useful for persistence.
     */
    getState(): InteractionContextState {
        return JSON.parse(JSON.stringify(this.state)); // Return a deep copy
    }

    /**
     * Restores the internal state from a saved state object.
     */
    restoreState(state: InteractionContextState) {
        // Basic validation
        if (state && state.chatId) {
            this.state = state;
        } else {
            console.error("[Context] Failed to restore state: Invalid state object.");
             // Decide how to handle this - perhaps reset to initial state for this chatId
        }
    }
}