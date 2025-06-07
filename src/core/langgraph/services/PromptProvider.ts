// src/core/langgraph/services/PromptProvider.ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { IPromptProvider } from "./interfaces/DependencyInterfaces";
import { analysisPromptLC } from "../../../features/ai/prompts/optimized/analysisPrompt";
import { reasoningPromptLC } from "../../../features/ai/prompts/optimized/reasoningPrompt";
import { responsePromptLC } from "../../../features/ai/prompts/optimized/responsePrompt";

// Placeholder para el prompt de validación
const VALIDATION_PROMPT_TEMPLATE = `
An automated process encountered errors. Based on the context, suggest corrections.
Errors: {errors}
Context: {context}
Respond ONLY with a JSON object: { "stateUpdates": { "currentPlan": ["...", "..."], "error": "optional new error message" }, "error": "summary of unrecoverable issue" }
`;

export class PromptProvider implements IPromptProvider {
    public getAnalysisPrompt(): ChatPromptTemplate {
        return analysisPromptLC;
    }

    public getReasoningPrompt(): ChatPromptTemplate {
        return reasoningPromptLC;
    }

    public getValidationPrompt(): ChatPromptTemplate {
        return ChatPromptTemplate.fromTemplate(VALIDATION_PROMPT_TEMPLATE);
    }

    public getResponsePrompt(): ChatPromptTemplate {
        return responsePromptLC;
    }
}