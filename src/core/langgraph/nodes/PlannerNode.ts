// src/core/langgraph/nodes/PlannerNode.ts
import { AIMessage, BaseMessage, ToolMessage, isAIMessage, isHumanMessage, isToolMessage } from "@langchain/core/messages";
import { IPlannerService, IContextBuilderService } from "../services/interfaces/DependencyInterfaces"; // <-- MODIFICAR: Añadir IContextBuilderService
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode } from "./BaseNode";

const MAX_TASK_RETRIES = 3;

export class PlannerNode extends BaseNode {
    private plannerService: IPlannerService;
    private contextBuilder: IContextBuilderService; // <-- AÑADIR

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.PLANNER, dependencies, observability);
        this.plannerService = dependencies.get('IPlannerService');
        this.contextBuilder = dependencies.get('IContextBuilderService'); // <-- AÑADIR: Inyectar el servicio
    }

    protected async executeCore(state: SimplifiedOptimizedGraphState): Promise<Partial<SimplifiedOptimizedGraphState>> {
        const lastMessage = state.messages[state.messages.length - 1];
        const lastToolFailed = lastMessage && isToolMessage(lastMessage) && lastMessage.content.toString().startsWith('Error:');

        let retryCount = state.currentTaskRetryCount || 0;

        if (lastToolFailed) {
            retryCount++;
        } else {
            retryCount = 0;
        }

        if (retryCount >= MAX_TASK_RETRIES) {
            const errorMessage = `La tarea "${state.currentTask}" ha fallado ${MAX_TASK_RETRIES} veces. Abortando plan.`;
            console.warn(`[PlannerNode] ${errorMessage}`);
            return {
                messages: [...state.messages, new AIMessage(`System: ${errorMessage}`)],
                isCompleted: true,
                error: errorMessage,
            };
        }

        // MODIFICAR: Delegamos la creación del contexto al nuevo servicio.
        const plannerContext = this.contextBuilder.forPlanner(state);
        const planResult = await this.plannerService.updatePlan(plannerContext);

        console.log('--- [PlannerNode] OUTPUT ---');
        console.log('Thought:', planResult.thought);
        console.log('New Plan:', planResult.plan);
        console.log('Is Complete:', planResult.isPlanComplete);
        console.log('Next Task:', planResult.nextTask);
        console.log('----------------------------');

        const thoughtMessage = new AIMessage({ content: `Planner Thought: ${planResult.thought}` });

        if (planResult.isPlanComplete) {
            return {
                messages: [...state.messages, thoughtMessage],
                currentPlan: [],
                isCompleted: true,
                currentTaskRetryCount: 0,
            };
        }

        const nextRetryCount = planResult.nextTask === state.currentTask ? retryCount : 0;

        return {
            messages: [...state.messages, thoughtMessage],
            currentPlan: planResult.plan,
            currentTask: planResult.nextTask,
            currentTaskRetryCount: nextRetryCount,
        };
    }

    // ELIMINAR: Estos métodos ya no son necesarios aquí.
    // private formatChatHistory(messages: BaseMessage[]): string { ... }
    // private formatExecutionHistory(messages: BaseMessage[]): string { ... }
}