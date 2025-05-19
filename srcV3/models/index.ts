// src/models/index.ts
// MODIFIED: Exporting new services and metadata
// MODIFIED: Removed export of modelUtils if it was deleted.

// Export provider instances/factories if needed (or manage only in ModelManager)
// REMOVED: export * from './providers/gemini'; // Removed custom API
// REMOVED: export * from './providers/ollama'; // Removed custom API

export * from './config/ModelManager'; // Export ModelManager
export * from './config/types'; // Export ModelType
// REMOVED: export * from './config/modelUtils'; // REMOVED parseModelResponse, extractJsonFromText might be private utility - REMOVE THIS LINE IF modelUtils.ts WAS DELETED

export * from './prompts'; // Export prompts (templates, builders, metadata)
export * from './prompts/promptMetadata'; // Export prompt metadata registry accessors

export * from './PromptService'; // Export the new PromptService