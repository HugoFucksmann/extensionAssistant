// src/core/langgraph/nodes/RespondNode.ts
import { AIMessage } from "@langchain/core/messages";
import { IResponseService } from "../services/interfaces/DependencyInterfaces";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode, NodeExecutionContext } from "./BaseNode";
import { EventType } from "../../../features/events/eventTypes"; // <<< AÑADIDO

export class RespondNode extends BaseNode {
    private responseService: IResponseService;

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.RESPONSE, dependencies, observability);
        this.responseService = dependencies.get('IResponseService');
        this.dispatcher = dependencies.get('InternalEventDispatcher');

    }

    protected async executeCore(
        state: SimplifiedOptimizedGraphState,
    ): Promise<Partial<SimplifiedOptimizedGraphState>> {

        const response = await this.responseService.generateResponse(state);
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
            debugInfo: {
                ...state.debugInfo,
                finalResponse: response.response,
                executionTime: executionTime
            }
        };

    }
}