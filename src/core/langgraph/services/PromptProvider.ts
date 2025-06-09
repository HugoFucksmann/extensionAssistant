// src/core/langgraph/services/PromptProvider.ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { IPromptProvider } from "./interfaces/DependencyInterfaces";
import { analysisPromptLC } from "../../../features/ai/prompts/optimized/analysisPrompt";
import { reasoningPromptLC } from "../../../features/ai/prompts/optimized/reasoningPrompt";
import { responsePromptLC } from "../../../features/ai/prompts/optimized/responsePrompt";
import { validationPromptLC } from "../../../features/ai/prompts/optimized/validationPrompt";

export class PromptProvider implements IPromptProvider {
    public getAnalysisPrompt(): ChatPromptTemplate {
        return analysisPromptLC;
    }

    public getReasoningPrompt(): ChatPromptTemplate {
        return reasoningPromptLC;
    }

    public getValidationPrompt(): ChatPromptTemplate {
        return validationPromptLC;
    }

    public getResponsePrompt(): ChatPromptTemplate {
        return responsePromptLC;
    }
}