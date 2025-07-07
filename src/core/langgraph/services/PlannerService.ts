// src/core/langgraph/services/PlannerService.ts
import { IModelManager, IPromptProvider, } from "./interfaces/DependencyInterfaces";
import { Plan, planSchema } from "../../../features/ai/prompts/plannerPrompt";
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PlannerContext } from "./ContextBuilderService";

export class PlannerService {
    constructor(
        private modelManager: IModelManager,
        private promptProvider: IPromptProvider
    ) { }

    async updatePlan(context: PlannerContext): Promise<Plan> {
        const model = this.modelManager.getActiveModel();
        const prompt = this.promptProvider.getPlannerPrompt();
        const chain = prompt
            .pipe(model)
            .pipe(new StringOutputParser())
            .pipe(createAutoCorrectStep(planSchema, model, { throwOnError: true }));

        return await chain.invoke({
            userQuery: context.userQuery,
            chatHistory: context.chatHistory,
            currentPlan: context.currentPlan.join('\n') || 'N/A',
            executionHistory: context.executionHistory,
            workingMemory: context.workingMemory,
        });
    }
}