// src/orchestrator/context/conversationContext.ts
// Corrected: Exporting only the interface with I prefix and removing the class export.

import { ChatMessage } from '../../store/interfaces/entities'; // Keep import
import { IFlowContextState } from './flowContext'; // Keep import if needed for type references within interface

export interface ConversationContextState {
    chatId: string;
    messages: ChatMessage[];
    summary?: string;
    relevantFiles?: string[];
    [key: string]: any;
}

// Remove the export of the class with the same name as the interface
/*
export class ConversationContextState { // Use a different name for the implementation class if needed internally
     constructor(chatId: string, initialMessages: ChatMessage[] = []) {
         Object.assign(this, {
             chatId: chatId,
             messages: initialMessages,
             summary: undefined,
             relevantFiles: undefined,
         });
     }
}
*/

export { ConversationContextState as IConversationContextState }; // Export interface
// Remove: export { ConversationContextState }; // REMOVED EXPORT OF CLASS WITH SAME NAME