// src/orchestrator/context/flowContext.ts
// Corrected: Exporting only the interface with I prefix and removing the class export.

import { InputAnalysisResult } from '../execution/types'; // Keep import
import { IConversationContextState } from './conversationContext'; // Keep import if needed for type references within interface

export interface FlowContextState {
    userMessage?: string;
    referencedFiles?: string[];
    analysisResult?: InputAnalysisResult;
    planningIteration?: number;
    planningHistory?: Array<any>;
    [key: string]: any;
    chatHistoryString?: string;
}

// Remove the export of the class with the same name as the interface
/*
export class FlowContextState { // Use a different name for the implementation class if needed internally
     constructor(initialState: Partial<FlowContextState> = {}) {
         Object.assign(this, {
             planningIteration: 1,
             planningHistory: [],
             chatHistoryString: undefined,
             ...initialState
         });
     }
}
*/

export { FlowContextState as IFlowContextState }; // Export interface
// Remove: export { FlowContextState }; // REMOVED EXPORT OF CLASS WITH SAME NAME