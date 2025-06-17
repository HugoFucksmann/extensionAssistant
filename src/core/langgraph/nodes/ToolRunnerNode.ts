// src/core/langgraph/nodes/ToolRunnerNode.ts
import { ToolMessage } from "@langchain/core/messages";
import { IToolRegistry, IMemoryService } from "../services/interfaces/DependencyInterfaces";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode } from "./BaseNode";
import { generateUniqueId } from "../../../shared/utils/generateIds";

export class ToolRunnerNode extends BaseNode {
    private toolRegistry: IToolRegistry;
    private memoryService: IMemoryService;

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.TOOL_RUNNER, dependencies, observability);
        this.toolRegistry = dependencies.get('IToolRegistry');
        this.memoryService = dependencies.get('IMemoryService');
    }

    protected async executeCore(state: SimplifiedOptimizedGraphState): Promise<Partial<SimplifiedOptimizedGraphState>> {
        const toolCall = state.debugInfo?.pendingToolCall;
        if (!toolCall || !toolCall.tool) {
            throw new Error("ToolRunnerNode no recibió ninguna herramienta para ejecutar desde el ExecutorNode.");
        }

        const toolResult = await this.toolRegistry.executeTool(toolCall.tool, toolCall.parameters, { chatId: state.chatId });

        const toolMessageContent = toolResult.success
            ? JSON.stringify(toolResult.data)
            : `Error: Tool execution failed. Reason: ${toolResult.error}`;

        const toolMessage = new ToolMessage({
            content: toolMessageContent,
            name: toolCall.tool,
            tool_call_id: generateUniqueId(),
        });

        // Actualizar la memoria con el resultado de la tool
        await this.memoryService.updateWorkingMemory(
            state.chatId,
            toolMessageContent,
            [...state.messages, toolMessage],
            state.currentTask
        );

        return {
            messages: [...state.messages, toolMessage],
            debugInfo: { ...state.debugInfo, pendingToolCall: undefined },
        };
    }
}