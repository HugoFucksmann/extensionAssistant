// src/core/langgraph/nodes/ExecutorNode.ts
import { AIMessage } from "@langchain/core/messages";
import { IExecutorService, IToolRegistry, IContextBuilderService } from "../services/interfaces/DependencyInterfaces";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode } from "./BaseNode";

export class ExecutorNode extends BaseNode {
    private executorService: IExecutorService;
    private toolRegistry: IToolRegistry;
    private contextBuilder: IContextBuilderService;

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.EXECUTOR, dependencies, observability);
        this.executorService = dependencies.get('IExecutorService');
        this.toolRegistry = dependencies.get('IToolRegistry');
        this.contextBuilder = dependencies.get('IContextBuilderService');
    }

    protected async executeCore(state: SimplifiedOptimizedGraphState): Promise<Partial<SimplifiedOptimizedGraphState>> {
        console.log('--- [ExecutorNode] INICIO ---');
        
        const { currentPlan, currentTaskIndex } = state;

        if (!currentPlan || currentTaskIndex >= currentPlan.length) {
            console.log('[ExecutorNode] No hay más tareas o plan. Completando.');
            return { isCompleted: true };
        }

        const task = currentPlan[currentTaskIndex];
        console.log(`[ExecutorNode] Tarea actual (índice ${currentTaskIndex}): ${task}`);

        // Asignar la tarea al estado ANTES de construir el contexto.
        state.currentTask = task;

        const executorContext = this.contextBuilder.forExecutor(state);
        console.log('[ExecutorNode] Contexto construido para executor.');
        
        const executorResult = await this.executorService.generateToolCall(executorContext);
        console.log('[ExecutorNode] Resultado de executorService:', JSON.stringify(executorResult, null, 2));

        const thoughtMessage = new AIMessage({ content: executorResult.thought });

        const toolCallInfo = {
            tool: executorResult.tool,
            parameters: executorResult.parameters,
        };

        return {
            messages: [...state.messages, thoughtMessage],
            debugInfo: { ...state.debugInfo, pendingToolCall: toolCallInfo },
            currentTask: task, // Keep the current task for the ToolRunnerNode
        };
    }
}