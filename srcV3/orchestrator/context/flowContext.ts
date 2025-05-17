// src/orchestrator/context/flowContext.ts
import { InputAnalysisResult } from '../execution/types';
import { ConversationContext } from './conversationContext';

interface FlowContextState {
    userMessage?: string;
    referencedFiles?: string[];
    analysisResult?: InputAnalysisResult;
   
    isReplanning?: boolean;
    replanReason?: string; 
    replanData?: any; 
    [key: string]: any; 
}

/**
 * Manages the state and data for a single *turn of execution* within a conversation.
 * Accumulates analysis results and step execution outcomes for the current user input.
 * Linked to its parent ConversationContext.
 */
export class FlowContext {
    private state: FlowContextState;
    private conversationContext: ConversationContext;

    constructor(conversationContext: ConversationContext, initialState: Partial<FlowContextState> = {}) {
        this.conversationContext = conversationContext;
        this.state = {
            ...initialState
        };
        console.log(`[FlowContext:${this.getChatId()}] Initialized.`);
    }

    getChatId(): string {
        return this.conversationContext.getChatId();
    }

    getConversationContext(): ConversationContext {
        return this.conversationContext;
    }

    /**
     * Stores a value specific to this flow execution using a specific key.
     * Can be used for step results, temporary data, etc.
     */
    setValue(key: string, value: any) {
       
         if (['chatId', 'messages', 'summary', 'relevantFiles', 'analyzedFileInsights', 'retrievedMemory', 'isReplanning', 'replanReason', 'replanData'].includes(key)) { // <-- Add replanning keys
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

        // 1. Add FlowContext state (highest priority)
        for (const key in this.state) {
            if (this.state[key] !== undefined) {
                resolutionContextData[key] = this.state[key];
            }
        }

        // 2. Add ConversationContext state (excluding messages, handled by chatHistoryString)
        const convState = this.conversationContext.getState();
        for (const key in convState) {
             // Exclude messages and currentFlowContext
             if (key !== 'messages' && key !== 'currentFlowContext' && convState[key] !== undefined && resolutionContextData[key] === undefined) {
                 resolutionContextData[key] = convState[key];
             }
        }
         resolutionContextData['chatHistoryString'] = this.conversationContext.getHistoryForModel(10);

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

        // Ensure userMessage is explicitly added if not already from state
        if (resolutionContextData.userMessage === undefined) {
             const lastMessage = this.conversationContext.getHistory().slice(-1)[0];
             if (lastMessage && lastMessage.sender === 'user') {
                  resolutionContextData.userMessage = lastMessage.content;
             } else {
                  resolutionContextData.userMessage = '';
             }
        }
        return resolutionContextData;
    }

    /**
     * Gets the full internal state.
     */
    getState(): FlowContextState {
        const stateCopy: any = { ...this.state };
        return stateCopy as FlowContextState;
    }

    dispose(): void {
         console.log(`[FlowContext:${this.getChatId()}] Disposed.`);
         this.state = {};
    }
}