// src/core/langgraph/services/PromptProvider.ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { IPromptProvider } from "./interfaces/DependencyInterfaces";

import { plannerPromptLC } from "../../../features/ai/prompts/plannerPrompt";
import { executorPromptLC } from "../../../features/ai/prompts/executorPrompt";
import { finalResponsePromptLC } from "../../../features/ai/prompts/finalResponsePrompt";
import { errorCorrectionPromptLC } from "../../../features/ai/prompts/errorCorrectionPrompt"; // <-- AÑADIR

export class PromptProvider implements IPromptProvider {
    public getPlannerPrompt(): ChatPromptTemplate {
        return plannerPromptLC;
    }
    public getExecutorPrompt(): ChatPromptTemplate {
        return executorPromptLC;
    }
    public getFinalResponsePrompt(): ChatPromptTemplate {
        return finalResponsePromptLC;
    }
    public getErrorCorrectionPrompt(): ChatPromptTemplate { // <-- AÑADIR
        return errorCorrectionPromptLC;
    }
}