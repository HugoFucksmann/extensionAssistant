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
            error: undefined,
        };

        switch (decision.decision) {
            case 'modify_plan':

                updatedState.currentPlan = decision.newPlan;
                updatedState.currentTask = undefined;
                console.log('[ErrorNode] Modifying plan. New plan:', decision.newPlan);
                break;

            case 'retry':

                console.log('[ErrorNode] Retrying task. The Planner will re-evaluate.');
                break;

            case 'continue':

                if (state.currentTask && state.currentPlan.includes(state.currentTask)) {
                    updatedState.currentPlan = state.currentPlan.filter(task => task !== state.currentTask);
                }
                updatedState.currentTask = undefined;
                console.log('[ErrorNode] Error deemed non-critical. Continuing with the next task.');
                break;
        }

        return updatedState;
    }
}