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
            // Esto podría significar que no se necesita ninguna herramienta, así que pasamos al siguiente paso.
            console.log("[ToolRunnerNode] No hay herramienta pendiente para ejecutar. Avanzando al siguiente paso.");
            return {
                currentTaskIndex: state.currentTaskIndex + 1,
                currentTask: undefined,
            };
        }

        console.log(`[ToolRunnerNode] Ejecutando herramienta: ${toolCall.tool} con parámetros:`, toolCall.parameters);
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

        // Si la herramienta tuvo éxito, avanzamos al siguiente índice.
        const nextTaskIndex = toolResult.success ? state.currentTaskIndex + 1 : state.currentTaskIndex;
        
        // Si hemos completado todas las tareas, marcamos como completado.
        const isCompleted = nextTaskIndex >= state.currentPlan.length;

        return {
            messages: [...state.messages, toolMessage],
            debugInfo: { ...state.debugInfo, pendingToolCall: undefined },
            currentTaskIndex: nextTaskIndex,
            currentTask: undefined, // Limpiamos la tarea actual
            isCompleted: isCompleted,
            error: toolResult.success ? undefined : toolResult.error, // Propagamos el error si lo hubo
        };
    }
}