// src/core/langgraph/services/ErrorCorrectionService.ts
import { IModelManager, IPromptProvider } from "./interfaces/DependencyInterfaces";
import { ErrorCorrectionDecision, errorCorrectionSchema } from "../../../features/ai/prompts/errorCorrectionPrompt";
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";
import { StringOutputParser } from "@langchain/core/output_parsers";

// Definimos una interfaz para el contexto que necesita este servicio.
export interface ErrorContext {
    userQuery: string;
    currentPlan: string[];
    failedTask: string;
    errorDetails: string;
    executionHistory: string;
}

export class ErrorCorrectionService {
    constructor(
        private modelManager: IModelManager,
        private promptProvider: IPromptProvider
    ) { }

    async analyzeError(context: ErrorContext): Promise<ErrorCorrectionDecision> {
        const model = this.modelManager.getActiveModel();
        const prompt = this.promptProvider.getErrorCorrectionPrompt();

        const chain = prompt
            .pipe(model)
            .pipe(new StringOutputParser())
            .pipe(createAutoCorrectStep(errorCorrectionSchema, model, { throwOnError: true }));

        return await chain.invoke({
            userQuery: context.userQuery,
            currentPlan: context.currentPlan.join('\n') || 'N/A',
            failedTask: context.failedTask,
            errorDetails: context.errorDetails,
            executionHistory: context.executionHistory || 'No tools were executed before the error.',
        });
    }
}