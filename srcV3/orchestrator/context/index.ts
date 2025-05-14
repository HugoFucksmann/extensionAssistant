// src/orchestrator/context/index.ts

// Export the refactored FlowContext (formerly InteractionContext)
export { FlowContext } from './flowContext'; // Updated export

// Export the new context classes
export { GlobalContext } from './globalContext';
export { SessionContext } from './sessionContext';
export { ConversationContext } from './conversationContext';

// Export existing types if needed elsewhere
export { InputAnalysisResult, ExecutionStep, StepResult, IExecutor, PromptType, PromptVariables, BasePromptVariables } from '../execution/types';

// Export handlers if they are considered part of the 'orchestrator' public API (optional)
export * from '../handlers';