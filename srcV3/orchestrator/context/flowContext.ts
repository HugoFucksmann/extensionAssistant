// src/orchestrator/context/flowContext.ts // Renamed from interactionContext.ts
import { InputAnalysisResult } from '../execution/types';
import { ConversationContext } from './conversationContext'; // Import parent context

// ChatMessage interface definition (can be imported or redefined here)
// Keeping a minimal definition here for clarity, but ideally import from storage/interfaces/entities
interface ChatMessage {
    role?: 'user' | 'assistant'; // Deprecated, prefer sender
    content: string;
    timestamp: number;
    sender: 'user' | 'assistant' | 'system'; // Use sender
    chatId?: string; // Should be available via parent context
    files?: string[];
}

interface FlowContextState {
    // Data specific to the current turn/flow execution
    // Note: chatId and chatHistory are now primarily managed by ConversationContext
    userMessage?: string;
    referencedFiles?: string[];
    projectInfo?: any; // Could be fetched from SessionContext/GlobalContext
    analysisResult?: InputAnalysisResult;
    // Store results of steps, e.g., 'activeEditorContent', 'fileContent:...', 'searchResults:...'
    [key: string]: any;
}

/**
 * Manages the state and data for a single *turn of execution* within a conversation.
 * Accumulates analysis results and step execution outcomes for the current user input.
 * Linked to its parent ConversationContext.
 */
export class FlowContext {
    private state: FlowContextState;
    private conversationContext: ConversationContext; // Link to parent

    constructor(conversationContext: ConversationContext, initialState: Partial<FlowContextState> = {}) {
        this.conversationContext = conversationContext;
        this.state = {
             // Initialize state for a new turn
            ...initialState
        };
        console.log(`[FlowContext:${this.getChatId()}] Initialized.`);
    }

    // Delegate core properties/methods to parent context
    getChatId(): string {
        return this.conversationContext.getChatId();
    }

    addMessage(sender: 'user' | 'assistant', content: string, files?: string[]): void {
         // This is now handled by ChatService which adds it to ConversationContext directly,
         // but keeping a similar method here might be useful if FlowContext
         // needs to know about messages added *during* its lifetime before they are persisted/added to ConversationContext.
         // For now, let's assume messages are added to ConversationContext by ChatService
         // BEFORE the FlowContext is processed by the orchestrator loop.
         // If the Orchestrator loop modifies messages, they should be added via ChatService.
         // Let's remove this method to avoid confusion.
         // **Decision:** Remove `addMessage` from FlowContext. Messages are managed at the ConversationContext level via ChatService.
    }

    // Access parent context
    getConversationContext(): ConversationContext {
        return this.conversationContext;
    }

    /**
     * Stores a value specific to this flow execution using a specific key.
     * Can be used for step results, temporary data, etc.
     */
    setValue(key: string, value: any) {
        // Prevent overwriting critical parent context properties if keys overlap by accident
         if (['chatId', 'messages', 'summary', 'relevantFiles'].includes(key)) {
            console.warn(`[FlowContext:${this.getChatId()}] Attempted to overwrite potential ConversationContext key: ${key}`);
            return;
        }
        this.state[key] = value;
        console.log(`[FlowContext:${this.getChatId()}] Set value for key '${key}'.`);
    }

    /**
     * Retrieves a value from the flow context state by key.
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
     * Provides a flattened view of the *relevant* context data from all layers
     * suitable for parameter resolution via {{placeholder}} patterns or passing to buildVariables functions.
     * Gathers data from Global, Session, Conversation, and Flow layers.
     */
    getResolutionContext(): Record<string, any> {
        const resolutionContextData: Record<string, any> = {};

        // 1. Add FlowContext state (highest priority for overrides)
        for (const key in this.state) {
            if (this.state[key] !== undefined) {
                resolutionContextData[key] = this.state[key];
            }
        }

        // 2. Add ConversationContext state (excluding messages, handled by chatHistoryString/History)
        const convState = this.conversationContext.getState();
        for (const key in convState) {
             if (key !== 'messages' && convState[key] !== undefined && resolutionContextData[key] === undefined) {
                 resolutionContextData[key] = convState[key];
             }
        }
         // Add formatted chat history string
         resolutionContextData['chatHistoryString'] = this.conversationContext.getHistoryForModel(10);
         // Add full message history array if needed by some prompts/tools
         // resolutionContextData['chatHistoryArray'] = this.conversationContext.getHistory();


        // 3. Add SessionContext state
        const sessionState = this.conversationContext.getSessionContext().getState();
        for (const key in sessionState) {
            if (sessionState[key] !== undefined && resolutionContextData[key] === undefined) {
                resolutionContextData[key] = sessionState[key];
            }
        }

        // 4. Add GlobalContext state (lowest priority)
        const globalState = this.conversationContext.getSessionContext().getGlobalContext().getState();
        for (const key in globalState) {
            if (globalState[key] !== undefined && resolutionContextData[key] === undefined) {
                resolutionContextData[key] = globalState[key];
            }
        }


        // Ensure userMessage is explicitly added if not already from state (should be from state.userMessage)
        if (resolutionContextData.userMessage === undefined) {
             // This case ideally shouldn't happen if ChatService sets userMessage in flow context
             console.warn('[FlowContext] userMessage not found in state for resolution context.');
             // Attempt to get from last message in history if available (fallback)
             const lastMessage = this.conversationContext.getHistory().slice(-1)[0];
             if (lastMessage && lastMessage.sender === 'user') {
                  resolutionContextData.userMessage = lastMessage.content;
             } else {
                  resolutionContextData.userMessage = ''; // Default empty
             }
        }


        console.log(`[FlowContext:${this.getChatId()}] Generated resolution context.`); // Log keys/structure in dev mode
        // if (process.env.NODE_ENV === 'development') {
        //      console.log(JSON.stringify(resolutionContextData, null, 2));
        // }

        return resolutionContextData;
    }

    /**
     * Gets the full internal state. Useful for persistence (though FlowContext is typically short-lived).
     */
    getState(): FlowContextState {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Restores the internal state from a saved state object (less common for FlowContext).
     */
    restoreState(state: FlowContextState) {
        if (state) {
            this.state = state;
        } else {
            console.error(`[FlowContext:${this.getChatId()}] Failed to restore state: Invalid state object.`);
        }
    }

    dispose(): void {
         // Clean up resources if any
         console.log(`[FlowContext:${this.getChatId()}] Disposed.`);
         // Consider clearing internal state for garbage collection
         this.state = {};
    }
}