// src/core/langgraph/nodes/ToolRunnerNode.ts
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
        // El ExecutorNode habrá guardado la llamada pendiente en debugInfo
        const toolCall = state.debugInfo?.pendingToolCall;
        if (!toolCall || !toolCall.tool) {
            // Esto es un error de lógica interna, debería abortar
            throw new Error("ToolRunnerNode no recibió ninguna herramienta para ejecutar desde el ExecutorNode.");
        }

        // Ejecutamos la herramienta
        const toolResult = await this.toolRegistry.executeTool(toolCall.tool, toolCall.parameters, { chatId: state.chatId });

        // Creamos el ToolMessage con el resultado para el historial
        // Es CRÍTICO que el contenido sea un string, incluso si es un error.
        const toolMessageContent = toolResult.success
            ? JSON.stringify(toolResult.data)
            // Si falla, formateamos un mensaje de error claro para el Planner
            : `Error: Tool execution failed. Reason: ${toolResult.error}`;

        const toolMessage = new ToolMessage({
            content: toolMessageContent,
            name: toolCall.tool,
            tool_call_id: generateUniqueId(), // ID único para este mensaje
        });

        // Devolvemos el estado actualizado con el nuevo mensaje y limpiamos la llamada pendiente
        return {
            messages: [...state.messages, toolMessage],
            debugInfo: { ...state.debugInfo, pendingToolCall: undefined },
        };
    }
}