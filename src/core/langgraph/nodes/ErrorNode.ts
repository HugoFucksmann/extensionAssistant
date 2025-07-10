// src/core/langgraph/nodes/ErrorNode.ts
import { AIMessage } from "@langchain/core/messages";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode, NodeExecutionContext } from "./BaseNode";
import { IErrorCorrectionService, IContextBuilderService } from "../services/interfaces/DependencyInterfaces";

export class ErrorNode extends BaseNode {
    private errorCorrectionService: IErrorCorrectionService;
    private contextBuilder: IContextBuilderService;

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.ERROR_HANDLER, dependencies, observability);
        this.errorCorrectionService = dependencies.get('IErrorCorrectionService');
        this.contextBuilder = dependencies.get('IContextBuilderService');
    }

    protected async executeCore(
        state: SimplifiedOptimizedGraphState,
        context: NodeExecutionContext
    ): Promise<Partial<SimplifiedOptimizedGraphState>> {
        console.log(`[ErrorNode] Analyzing error: ${state.error}`);

        const errorContext = this.contextBuilder.forError(state);

        const decision = await this.errorCorrectionService.analyzeError(errorContext);

        console.log('[ErrorNode] Self-correction decision:', decision);

        const systemMessage = new AIMessage({
            content: `System Thought (Error Correction): ${decision.thought}\nDecision: ${decision.decision}.`
        });

        const updatedState: Partial<SimplifiedOptimizedGraphState> = {
            messages: [...state.messages, systemMessage],
        };

        switch (decision.decision) {
            case 'modify_plan':
                updatedState.currentPlan = decision.newPlan;
                updatedState.currentTask = undefined;
                updatedState.currentTaskIndex = 0; // Reset index for the new plan
                console.log('[ErrorNode] Modifying plan. New plan:', decision.newPlan);
                break;

            case 'retry':
                // No state change needed, just clear the error and let it re-route to planner
                console.log('[ErrorNode] Retrying task. The Planner will re-evaluate.');
                break;

            case 'continue':
                if (state.currentTask && state.currentPlan.includes(state.currentTask)) {
                    const taskIndex = state.currentPlan.indexOf(state.currentTask);
                    // If we are not at the end of the plan, increment the index
                    if (taskIndex < state.currentPlan.length - 1) {
                        updatedState.currentTaskIndex = taskIndex + 1;
                    }
                }
                updatedState.currentTask = undefined;
                console.log('[ErrorNode] Error deemed non-critical. Continuing with the next task.');
                break;
        }

        // ALWAYS clear the error after handling it.
        updatedState.error = undefined;

        return updatedState;
    }
}