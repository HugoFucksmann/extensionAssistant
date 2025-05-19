// src/services/index.ts
// MODIFIED: Exporting new services
// MODIFIED: Exporting the new codeUnderstanding submodule

export { ConversationManager } from './ConversationManager'; // Export ConversationManager
export { ChatInteractor } from './ChatInteractor'; // Export ChatInteractor

// Export the new CodeUnderstandingService from its submodule
export * from './codeUnderstanding'; // Export all from codeUnderstanding directory

// Placeholder for other services like CodeUnderstandingService (now exported above)
// export { CodeUnderstandingService } from './CodeUnderstandingService'; // REMOVED - replaced by export *