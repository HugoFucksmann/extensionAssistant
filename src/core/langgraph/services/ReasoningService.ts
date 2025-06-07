// src/core/langgraph/services/ReasoningService.ts
import { ToolMessage } from "@langchain/core/messages";
import { reasoningOutputSchema } from "../../../features/ai/prompts/optimized/reasoningPrompt";
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";
import type { ReasoningOutput } from "../../../features/ai/prompts/optimized/reasoningPrompt";
import { IModelManager, IPromptProvider, IReasoningService, IToolRegistry } from "./interfaces/DependencyInterfaces";
import { SimplifiedOptimizedGraphState } from "../state/GraphState";

function formatToolsDescription(toolRegistry: IToolRegistry): string {
    // Esta función se puede mover a una utilidad si se reutiliza.
    // Implementación simplificada.
    return toolRegistry.getToolNames().join(', ');
}

export class ReasoningService implements IReasoningService {
    constructor(
        private modelManager: IModelManager,
        private promptProvider: IPromptProvider,
        private toolRegistry: IToolRegistry
    ) { }

    async generateReasoningAndAction(state: SimplifiedOptimizedGraphState): Promise<ReasoningOutput> {
        const model = this.modelManager.getActiveModel();
        const prompt = this.promptProvider.getReasoningPrompt();

        const parseStep = createAutoCorrectStep(reasoningOutputSchema, model, { maxAttempts: 2 });
        const chain = prompt.pipe(model).pipe(parseStep);

        const previousToolResults = state.messages
            .filter((m): m is ToolMessage => m._getType() === 'tool')
            .map(tm => ({ name: tm.name, result: tm.content }));

        const reasoningResult = await chain.invoke({
            userQuery: state.userInput,
            analysisResult: JSON.stringify({ understanding: state.workingMemory, plan: state.currentPlan }),
            toolsDescription: formatToolsDescription(this.toolRegistry),
            previousToolResults: JSON.stringify(previousToolResults),
            memoryContext: state.retrievedMemory
        });

        // Adaptar la salida del prompt al tipo ReasoningOutput inferido por Zod
        return {
            reasoning: reasoningResult.reasoning,
            nextAction: reasoningResult.nextAction,
            tool: reasoningResult.tool ?? undefined,
            parameters: reasoningResult.parameters ?? undefined,
            response: reasoningResult.response ?? undefined,
        };
    }
}