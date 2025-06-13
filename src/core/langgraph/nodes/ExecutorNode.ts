// src/core/langgraph/nodes/ExecutorNode.ts
import { AIMessage } from "@langchain/core/messages";
import { IExecutorService, IToolRegistry } from "../services/interfaces/DependencyInterfaces";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode } from "./BaseNode";

export class ExecutorNode extends BaseNode {
    private executorService: IExecutorService;
    private toolRegistry: IToolRegistry;

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.EXECUTOR, dependencies, observability);
        this.executorService = dependencies.get('IExecutorService');
        this.toolRegistry = dependencies.get('IToolRegistry');
    }

    protected async executeCore(state: SimplifiedOptimizedGraphState): Promise<Partial<SimplifiedOptimizedGraphState>> {
        if (!state.currentTask) {
            throw new Error("ExecutorNode no recibió ninguna tarea para ejecutar.");
        }

        // 1. Pedir al LLM que elija una herramienta y parámetros
        const executorResult = await this.executorService.generateToolCall(
            state.currentTask,
            state.userInput,
            this.toolRegistry.getToolNames().join(', ') // O una descripción más detallada
        );

        const thoughtMessage = new AIMessage({ content: `Executor Thought: ${executorResult.thought}` });

        // 2. Guardar la llamada a la herramienta en el estado para que el ToolRunner la recoja
        const toolCallInfo = {
            tool: executorResult.tool,
            parameters: executorResult.parameters,
        };

        // 3. Actualizar el estado
        return {
            messages: [...state.messages, thoughtMessage],
            // Guardamos la decisión en un campo temporal del estado
            debugInfo: { ...state.debugInfo, pendingToolCall: toolCallInfo },
            // Limpiamos la tarea actual porque ya ha sido procesada por el Executor
            currentTask: undefined,
        };
    }
}