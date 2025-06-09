// src/core/langgraph/nodes/ErrorNode.ts
import { AIMessage } from "@langchain/core/messages";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode, NodeExecutionContext } from "./BaseNode";
import { EventType } from "../../../features/events/eventTypes";

export class ErrorNode extends BaseNode {
    constructor(dependencies: any, observability: any) {
        super(GraphPhase.ERROR_HANDLER, dependencies, observability);
        this.dispatcher = dependencies.get('InternalEventDispatcher');
    }

    protected async executeCore(
        state: SimplifiedOptimizedGraphState,
        context: NodeExecutionContext
    ): Promise<Partial<SimplifiedOptimizedGraphState>> {
        const errorMessage = state.error || "Se ha producido un error desconocido.";

        // Crear una respuesta final y amigable para el usuario.
        const finalResponse = `Lo siento, he encontrado un problema y no puedo continuar con tu solicitud. El error fue: "${errorMessage}"`;

        const executionTime = Date.now() - state.startTime;

        // Despachar un evento de respuesta, aunque sea de error, para que la UI lo muestre.
        this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, {
            chatId: state.chatId,
            responseContent: finalResponse,
            isFinal: true,
            duration: executionTime,
            source: 'ErrorNode',
            metadata: { error: true }
        });

        // Marcar el flujo como completado aquí. Este es un nodo terminal.
        return {
            messages: [...state.messages, new AIMessage(finalResponse)],
            isCompleted: true,
            debugInfo: {
                ...state.debugInfo,
                finalResponse: finalResponse,
                executionTime: executionTime
            }
        };
    }
}