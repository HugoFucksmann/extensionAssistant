// src/core/langgraph/nodes/RespondNode.ts
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { IFinalResponseService, IContextBuilderService } from "../services/interfaces/DependencyInterfaces"; // <-- MODIFICAR: Añadir IContextBuilderService
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode } from "./BaseNode";
import { EventType } from "../../../features/events/eventTypes";

export class RespondNode extends BaseNode {
    private responseService: IFinalResponseService;
    private contextBuilder: IContextBuilderService; // <-- AÑADIR

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.RESPONSE, dependencies, observability);
        this.responseService = dependencies.get('IFinalResponseService');
        this.contextBuilder = dependencies.get('IContextBuilderService'); // <-- AÑADIR: Inyectar el servicio
        this.dispatcher = dependencies.get('InternalEventDispatcher');
    }

    protected async executeCore(state: SimplifiedOptimizedGraphState): Promise<Partial<SimplifiedOptimizedGraphState>> {
        // MODIFICAR: Creamos el contexto y llamamos al servicio.
        const responderContext = this.contextBuilder.forResponder(state);
        const response = await this.responseService.generateResponse(responderContext);

        const executionTime = Date.now() - state.startTime;

        this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, {
            chatId: state.chatId,
            responseContent: response.response,
            isFinal: true,
            duration: executionTime,
            source: 'RespondNode'
        });

        return {
            messages: [...state.messages, new AIMessage(response.response)],
            isCompleted: true,
            error: undefined,
        };
    }

    // ELIMINAR: Este método ya no es necesario aquí.
    // private formatHistoryForPrompt(messages: BaseMessage[]): string { ... }
}