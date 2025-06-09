// src/core/langgraph/nodes/ExecuteNode.ts
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { IReasoningService, IToolRegistry, IMemoryService } from "../services/interfaces/DependencyInterfaces";
import { GraphPhase, SimplifiedOptimizedGraphState, ToolExecution } from "../state/GraphState";
import { BaseNode, NodeExecutionContext } from "./BaseNode";
import { generateUniqueId } from "../../../shared/utils/generateIds";

export class ExecuteNode extends BaseNode {
    private reasoningService: IReasoningService;
    private toolRegistry: IToolRegistry;
    private memoryService: IMemoryService;

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.EXECUTION, dependencies, observability);
        this.reasoningService = dependencies.get('IReasoningService') as IReasoningService;
        this.toolRegistry = dependencies.get('IToolRegistry') as IToolRegistry;
        this.memoryService = dependencies.get('IMemoryService') as IMemoryService;
    }

    protected async executeCore(
        state: SimplifiedOptimizedGraphState,
        context: NodeExecutionContext
    ): Promise<Partial<SimplifiedOptimizedGraphState>> {

        const reasoningResult = await this.reasoningService.generateReasoningAndAction(state);

        let updates: Partial<SimplifiedOptimizedGraphState> = {
            messages: [...state.messages, new AIMessage(reasoningResult.reasoning)]
        };

        if (reasoningResult.nextAction === 'use_tool' && reasoningResult.tool) {
            const toolUpdates = await this.executeTool(reasoningResult.tool, reasoningResult.parameters, state);
            updates.messages = [...(updates.messages || []), ...(toolUpdates.messages || [])];
            delete toolUpdates.messages;
            updates = { ...updates, ...toolUpdates };
        } else {
            updates.isCompleted = true;
            if (reasoningResult.response) {
                updates.messages = [...(updates.messages || []), new AIMessage(reasoningResult.response)];
            }
        }

        return updates;
    }

    private async executeTool(
        toolName: string,
        toolInput: any,
        state: SimplifiedOptimizedGraphState
    ): Promise<Partial<SimplifiedOptimizedGraphState>> {

        const toolCallId = generateUniqueId();
        const toolResult = await this.toolRegistry.executeTool(toolName, toolInput, { chatId: state.chatId, operationId: toolCallId });

        const toolExecution: ToolExecution = {
            toolName: toolName,
            input: toolInput,
            output: toolResult.data,
            timestamp: Date.now(),
            success: toolResult.success,
            error: toolResult.error
        };

        const toolMessageContent = toolResult.success ? JSON.stringify(toolResult.data) : `Error: ${toolResult.error}`;

        const toolMessage = new ToolMessage({
            content: toolMessageContent,
            name: toolName,
            tool_call_id: toolCallId,
        });

        return {
            toolsUsed: [toolExecution],
            lastToolOutput: toolResult.data,
            messages: [toolMessage],
            requiresValidation: !toolResult.success,
            // CAMBIO: Limpiar el error si la herramienta tuvo éxito, o establecerlo si falló.
            error: toolResult.success ? undefined : toolResult.error
        };
    }
}