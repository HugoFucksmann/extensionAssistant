// src/core/langgraph/nodes/ErrorNode.ts
import { AIMessage } from "@langchain/core/messages";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode, NodeExecutionContext } from "./BaseNode";
import { EventType } from "../../../features/events/eventTypes";

export class ErrorNode extends BaseNode {
    constructor(dependencies: any, observability: any) {
        super(GraphPhase.ERROR_HANDLER, dependencies, observability);

    }

    protected async executeCore(
        state: SimplifiedOptimizedGraphState,
        context: NodeExecutionContext
    ): Promise<Partial<SimplifiedOptimizedGraphState>> {
        const errorMessage = state.error || "Se ha producido un error desconocido.";


        const finalResponse = `Lo siento, he encontrado un problema y no puedo continuar con tu solicitud. El error fue: "${errorMessage}"`;


        const executionTime = state.startTime ? Date.now() - state.startTime : 0;


        this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, {
            chatId: state.chatId,
            responseContent: finalResponse,
            isFinal: true,
            duration: executionTime,
            source: 'ErrorNode',
            metadata: { error: true }
        });


        return {
            messages: [...state.messages, new AIMessage(finalResponse)],
            isCompleted: true,
            error: undefined,
            debugInfo: {
                ...state.debugInfo,
                finalResponse: finalResponse,
                executionTime: executionTime,
                errorHandled: true
            }
        };
    }
}