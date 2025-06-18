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
        console.log('Estado recibido:', JSON.stringify(state, null, 2));
        if (!state.currentTask) {
            throw new Error("ExecutorNode no recibió ninguna tarea para ejecutar.");
        }

        const executorContext = this.contextBuilder.forExecutor(state);
        console.log('[ExecutorNode] Contexto construido para executor:', JSON.stringify(executorContext, null, 2));
        const executorResult = await this.executorService.generateToolCall(executorContext);
        console.log('[ExecutorNode] Resultado de executorService:', JSON.stringify(executorResult, null, 2));

        const thoughtMessage = new AIMessage({ content: `Executor Thought: ${executorResult.thought}` });

        const toolCallInfo = {
            toolLog: executorResult.tool,
            paramsLog: executorResult.parameters,
            tool: executorResult.tool,
            parameters: executorResult.parameters,
        };

        console.log('[ExecutorNode] Estado resultante:', {
            pendingToolCall: toolCallInfo,
            currentTask: undefined
        });
        return {
            messages: [...state.messages, thoughtMessage],
            debugInfo: { ...state.debugInfo, pendingToolCall: toolCallInfo },
            currentTask: undefined,
        };
    }
}