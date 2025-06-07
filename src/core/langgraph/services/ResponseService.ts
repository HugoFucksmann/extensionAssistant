// src/core/langgraph/services/ResponseService.ts
import { responseOutputSchema } from "../../../features/ai/prompts/optimized/responsePrompt";
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";
import type { ResponseOutput } from "../../../features/ai/prompts/optimized/responsePrompt";
import { IModelManager, IPromptProvider, IResponseService } from "./interfaces/DependencyInterfaces";
import { SimplifiedOptimizedGraphState } from "../state/GraphState";

export class ResponseService implements IResponseService {
    constructor(
        private modelManager: IModelManager,
        private promptProvider: IPromptProvider
    ) { }

    async generateResponse(state: SimplifiedOptimizedGraphState): Promise<ResponseOutput> {
        const model = this.modelManager.getActiveModel();
        const prompt = this.promptProvider.getResponsePrompt();

        const parseStep = createAutoCorrectStep(responseOutputSchema, model, { maxAttempts: 2 });
        const chain = prompt.pipe(model).pipe(parseStep);

        const toolResults = state.toolsUsed.map(t => ({ tool: t.toolName, result: t.output }));

        const response = await chain.invoke({
            userQuery: state.userInput,
            analysisResult: JSON.stringify({ understanding: state.workingMemory, initialPlan: state.currentPlan }),
            toolResults: JSON.stringify(toolResults),
            memoryContext: state.retrievedMemory
        });

        return { response: response.response };
    }
}