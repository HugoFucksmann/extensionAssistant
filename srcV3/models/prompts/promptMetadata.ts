// src/models/prompts/promptMetadata.ts
// MODIFIED: Import schemas from validation/schemas/models

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z, ZodSchema } from 'zod';
import { PromptType, BasePromptVariables } from "../../orchestrator"; // Import PromptType and types

import {
     inputAnalyzerPrompt, codeValidatorPrompt, conversationPrompt,
     explainCodePrompt, fixCodePrompt, plannerPrompt,
     buildInputAnalyzerVariables,
     buildCodeValidatorVariables,
     buildConversationVariables,
     buildExplainCodeVariables,
     buildFixCodeVariables,
     buildPlannerVariables
} from './index'; // Import prompt templates
// MODIFIED: Import output schemas from validation/schemas/models
import {
    CodeValidatorOutputSchema,
    ExplainCodeOutputSchema,
    FixCodeOutputSchema,
    InputAnalysisResultSchema, // Import the new schema
    PlannerResponseSchema // Import the new schema
} from '../../validation/schemas';


// Define interface for prompt metadata
export interface PromptMetadata<T extends BasePromptVariables = BasePromptVariables> {
     type: PromptType; // Unique type identifier
     template: ChatPromptTemplate; // LangChain prompt template
     buildVariables: (contextSnapshot: Record<string, any>) => T; // Function to build variables
     outputSchema: ZodSchema<any>; // Zod schema for output validation/parsing
     // Add other config like default LLM, temperature overrides etc.
}

// Central registry for all prompts
const PROMPT_REGISTRY: Map<PromptType, PromptMetadata<any>> = new Map();

// Helper to add prompts
function registerPrompt(metadata: PromptMetadata<any>): void {
     if (PROMPT_REGISTRY.has(metadata.type)) {
         console.warn(`[PromptMetadata] Prompt "${metadata.type}" already registered. Overwriting.`);
     }
    PROMPT_REGISTRY.set(metadata.type, metadata);
}

// Register all prompts with their metadata, builders, and schemas
registerPrompt({
     type: 'inputAnalyzer',
     template: inputAnalyzerPrompt,
     buildVariables: buildInputAnalyzerVariables,
     outputSchema: InputAnalysisResultSchema, // Use the imported schema
});

registerPrompt({
    type: 'codeValidator',
    template: codeValidatorPrompt,
    buildVariables: buildCodeValidatorVariables,
    outputSchema: CodeValidatorOutputSchema,
});

registerPrompt({
     type: 'conversationResponder',
     template: conversationPrompt,
     buildVariables: buildConversationVariables,
     // Output schema might be complex JSON or simple text.
     // If it's simple text expected, Zod.string() could work.
     // Based on prompt, it expects JSON { messageToUser: string }.
     outputSchema: z.object({ messageToUser: z.string() }).passthrough(), // Use passthrough for flexibility
});

registerPrompt({
     type: 'explainCodePrompt',
     template: explainCodePrompt,
     buildVariables: buildExplainCodeVariables, // Use base builder
     outputSchema: ExplainCodeOutputSchema,
});

registerPrompt({
     type: 'fixCodePrompt',
     template: fixCodePrompt,
     buildVariables: buildFixCodeVariables, // Use base builder
     outputSchema: FixCodeOutputSchema,
});

registerPrompt({
     type: 'planner',
     template: plannerPrompt,
     buildVariables: buildPlannerVariables,
     outputSchema: PlannerResponseSchema, // Use the imported schema
});


/**
 * Get the metadata for a specific prompt type.
 */
export function getPromptMetadata(type: PromptType): PromptMetadata<any> | undefined {
    return PROMPT_REGISTRY.get(type);
}

/**
 * Get metadata for all registered prompts.
 */
export function getAllPromptMetadata(): PromptMetadata<any>[] {
    return Array.from(PROMPT_REGISTRY.values());
}

 /**
  * List the names (types) of all registered prompts.
  */
 export function listPrompts(): PromptType[] {
     return Array.from(PROMPT_REGISTRY.keys());
 }