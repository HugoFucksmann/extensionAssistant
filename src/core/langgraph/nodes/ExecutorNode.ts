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

        const executorResult = await this.executorService.generateToolCall(
            state.currentTask,
            state.userInput,
            this.toolRegistry.getToolNames().join(', ') // O una descripción más detallada
        );

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