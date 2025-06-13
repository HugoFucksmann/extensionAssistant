import { ToolMessage } from "@langchain/core/messages";
import { IToolRegistry } from "../services/interfaces/DependencyInterfaces";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode } from "./BaseNode";
import { generateUniqueId } from "../../../shared/utils/generateIds";

export class ToolRunnerNode extends BaseNode {
    private toolRegistry: IToolRegistry;

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.TOOL_RUNNER, dependencies, observability);
        this.toolRegistry = dependencies.get('IToolRegistry');
    }

    protected async executeCore(state: SimplifiedOptimizedGraphState): Promise<Partial<SimplifiedOptimizedGraphState>> {
        const toolCall = state.debugInfo?.pendingToolCall;
        if (!toolCall || !toolCall.tool) {
            throw new Error("ToolRunnerNode no recibió ninguna herramienta para ejecutar.");
        }

        const toolResult = await this.toolRegistry.executeTool(toolCall.tool, toolCall.parameters, { chatId: state.chatId });

        const toolMessage = new ToolMessage({
            content: toolResult.success ? JSON.stringify(toolResult.data) : `Error: ${toolResult.error}`,
            name: toolCall.tool,
            tool_call_id: generateUniqueId(),
        });

        return {
            messages: [...state.messages, toolMessage],
            debugInfo: { ...state.debugInfo, pendingToolCall: undefined },
        };
    }
}