// src/orchestrator/index.ts
// MODIFIED: Exporting the new OrchestratorService
// MODIFIED: Explicitly exporting context state interfaces and execution types.

export { OrchestratorService } from './OrchestratorService'; // Export the new service

// Explicitly re-export context state interfaces from the context submodule
export { IFlowContextState, IGlobalContextState, ISessionContextState, IConversationContextState } from './context';

// Explicitly re-export necessary types from execution/types
export { InputAnalysisResult, PromptType, PromptVariables, BasePromptVariables, PlannerResponse, PlannerPromptVariables } from './execution/types';

// Remove the old export * from './context' and the old export of IFlowContextState
// export { IFlowContextState } from './context/flowContext'; // REMOVED - now re-exported from ./context
// export * from './context'; // REMOVED - replaced by explicit exports above