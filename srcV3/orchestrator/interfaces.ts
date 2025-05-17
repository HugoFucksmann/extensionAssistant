
 // src/orchestrator/interfaces.ts

import { FlowContext, ConversationContext } from "./context";
import { MemoryItem } from "../store"; 
import { EventEmitter } from 'events';


interface AgentOrchestratorEvents {
    'replanSuggested': (chatId: string, reason: string, newContextData?: any) => void;
    'agentStatusChanged': (chatId: string, agent: string, status: 'idle' | 'working' | 'error', task?: string, message?: string) => void;
}


export interface IOrchestrator {
    processUserMessage(flowContext: FlowContext): Promise<string | any>;
    addConversationContext(convContext: ConversationContext): void;
    clearConversationContext(chatId: string): void;
    getConversationContext(chatId: string): ConversationContext | undefined;
   
}


export interface IAgentOrchestrator extends EventEmitter {
    triggerProcessing(convContext: ConversationContext): void;
    getMemoryForTurn(convContext: ConversationContext): Promise<MemoryItem[]>;
 
    on<U extends keyof AgentOrchestratorEvents>(event: U, listener: AgentOrchestratorEvents[U]): this;
   
    removeAllListeners(event?: string): this;
  
    dispose(): void;
} 