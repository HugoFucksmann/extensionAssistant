// src/core/langgraph/nodes/PlannerNode.ts
import { AIMessage, BaseMessage, ToolMessage, isAIMessage, isHumanMessage, isToolMessage } from "@langchain/core/messages";
import { IPlannerService, IContextBuilderService } from "../services/interfaces/DependencyInterfaces";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode } from "./BaseNode";

const MAX_TASK_RETRIES = 3;

export class PlannerNode extends BaseNode {
    private plannerService: IPlannerService;
    private contextBuilder: IContextBuilderService;

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.PLANNER, dependencies, observability);
        this.plannerService = dependencies.get('IPlannerService');
        this.contextBuilder = dependencies.get('IContextBuilderService');
    }

    protected async executeCore(state: SimplifiedOptimizedGraphState): Promise<Partial<SimplifiedOptimizedGraphState>> {
        console.log('--- [PlannerNode] INICIO ---');
        console.log('Estado recibido:', JSON.stringify(state, null, 2));
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

        const plannerContext = this.contextBuilder.forPlanner(state);
        console.log('[PlannerNode] Contexto construido para planner:', JSON.stringify(plannerContext, null, 2));

        // Log extra: detectar si el contenido de getFileContents ya está presente
        if (plannerContext.executionHistory.includes('getFileContents')) {
            console.warn('[PlannerNode][ADVERTENCIA] El historial ya contiene una llamada a getFileContents.');
        }
        console.log('--- [PlannerNode] executionHistory for LLM ---');
        console.log(plannerContext.executionHistory);
        console.log('---------------------------------------------');
        const planResult = await this.plannerService.updatePlan(plannerContext);

        console.log('--- [PlannerNode] OUTPUT ---');
        console.log('Thought:', planResult.thought);
        console.log('New Plan:', planResult.plan);
        console.log('Is Complete:', planResult.isPlanComplete);
        console.log('Next Task:', planResult.nextTask);
        console.log('----------------------------');
        console.log('[PlannerNode] Estado resultante:', {
            currentPlan: planResult.plan,
            currentTask: planResult.nextTask,
            isCompleted: planResult.isPlanComplete
        });

        // Detectar loops: si el plan nuevo es igual al anterior o la tarea es igual
        if (JSON.stringify(planResult.plan) === JSON.stringify(state.currentPlan)) {
            console.warn('[PlannerNode][LOOP WARNING] El plan generado es igual al plan anterior.');
        }
        if (planResult.nextTask === state.currentTask) {
            console.warn('[PlannerNode][LOOP WARNING] La tarea generada es igual a la anterior.');
        }

        const thoughtMessage = new AIMessage({ content: `Planner Thought: ${planResult.thought}` });

        if (planResult.isPlanComplete) {
            return {
                messages: [...state.messages, thoughtMessage],
                currentPlan: [],
                currentTask: undefined,
                isCompleted: true,
                currentTaskRetryCount: 0,
            };
        }

        return {
            messages: [...state.messages, thoughtMessage],
            currentPlan: planResult.plan,
            currentTask: planResult.nextTask ?? undefined,
            currentTaskRetryCount: 0,
        };
    }
}