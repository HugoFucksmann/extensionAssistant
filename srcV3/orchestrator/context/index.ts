// srcV3/orchestrator/context/index.ts
// Corrected: Exporting only the state interfaces with I prefix
// MODIFIED: Removed re-export of execution types from here.

export { IFlowContextState } from './flowContext';
export { IGlobalContextState } from './globalContext';
export { ISessionContextState } from './sessionContext';
export { IConversationContextState } from './conversationContext';
