// src/core/langgraph/nodes/ExecutorNode.ts
import { AIMessage } from "@langchain/core/messages";
import { IExecutorService, IToolRegistry, IContextBuilderService } from "../services/interfaces/DependencyInterfaces"; // <-- MODIFICAR: Añadir IContextBuilderService
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode } from "./BaseNode";

export class ExecutorNode extends BaseNode {
    private executorService: IExecutorService;
    private toolRegistry: IToolRegistry;
    private contextBuilder: IContextBuilderService; // <-- AÑADIR

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.EXECUTOR, dependencies, observability);
        this.executorService = dependencies.get('IExecutorService');
        this.toolRegistry = dependencies.get('IToolRegistry');
        this.contextBuilder = dependencies.get('IContextBuilderService'); // <-- AÑADIR: Inyectar el servicio
    }

    protected async executeCore(state: SimplifiedOptimizedGraphState): Promise<Partial<SimplifiedOptimizedGraphState>> {
        if (!state.currentTask) {
            throw new Error("ExecutorNode no recibió ninguna tarea para ejecutar.");
        }

        // MODIFICAR: Creamos el contexto y llamamos al servicio.
        const executorContext = this.contextBuilder.forExecutor(state);
        const executorResult = await this.executorService.generateToolCall(executorContext);

        const thoughtMessage = new AIMessage({ content: `Executor Thought: ${executorResult.thought}` });

        const toolCallInfo = {
            tool: executorResult.tool,
            parameters: executorResult.parameters,
        };

        return {
            messages: [...state.messages, thoughtMessage],
            debugInfo: { ...state.debugInfo, pendingToolCall: toolCallInfo },
            currentTask: undefined,
        };
    }
}