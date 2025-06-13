import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { IPlannerService } from "../services/interfaces/DependencyInterfaces";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode } from "./BaseNode";

export class PlannerNode extends BaseNode {
    private plannerService: IPlannerService;

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.PLANNER, dependencies, observability);
        this.plannerService = dependencies.get('IPlannerService');
    }

    protected async executeCore(state: SimplifiedOptimizedGraphState): Promise<Partial<SimplifiedOptimizedGraphState>> {
        const planResult = await this.plannerService.updatePlan(
            state.userInput,
            state.currentPlan,
            this.formatExecutionHistory(state.messages)
        );

        const thoughtMessage = new AIMessage({ content: `Planner Thought: ${planResult.thought}` });

        if (planResult.isPlanComplete) {
            return {
                messages: [...state.messages, thoughtMessage],
                currentPlan: [],
                isCompleted: true,
            };
        }

        return {
            messages: [...state.messages, thoughtMessage],
            currentPlan: planResult.plan,
            currentTask: planResult.nextTask,
        };
    }

    private formatExecutionHistory(messages: BaseMessage[]): string {
        const lastToolMessage = messages.slice().reverse().find((msg): msg is ToolMessage => msg._getType() === 'tool');
        if (!lastToolMessage) return "No tools have been executed yet.";
        return `Last tool executed: ${lastToolMessage.name}\nResult: ${lastToolMessage.content}`;
    }
}