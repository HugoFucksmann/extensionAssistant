import { IModelManager, IPromptProvider } from "./interfaces/DependencyInterfaces";
import { Plan, planSchema, plannerPromptLC } from "../../../features/ai/prompts/plannerPrompt";
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";
import { StringOutputParser } from "@langchain/core/output_parsers";

export class PlannerService {
    constructor(
        private modelManager: IModelManager,
        private promptProvider: IPromptProvider
    ) { }

    async updatePlan(userQuery: string, chatHistory: string, currentPlan: string[], executionHistory: string): Promise<Plan> {
        const model = this.modelManager.getActiveModel();
        const prompt = this.promptProvider.getPlannerPrompt();
        const chain = prompt.pipe(model).pipe(new StringOutputParser()).pipe(createAutoCorrectStep(planSchema, model, { throwOnError: true }));

        return await chain.invoke({
            userQuery,
            // AÑADIR chatHistory al invoke
            chatHistory,
            currentPlan: currentPlan.join('\n') || 'N/A',
            executionHistory: executionHistory || 'N/A',
        });
    }
}