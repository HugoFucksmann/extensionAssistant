// src/core/langgraph/nodes/RespondNode.ts
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { IFinalResponseService } from "../services/interfaces/DependencyInterfaces";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode } from "./BaseNode";
import { EventType } from "../../../features/events/eventTypes";

export class RespondNode extends BaseNode {
    private responseService: IFinalResponseService;

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.RESPONSE, dependencies, observability);
        this.responseService = dependencies.get('IFinalResponseService');
        this.dispatcher = dependencies.get('InternalEventDispatcher');
    }

    protected async executeCore(state: SimplifiedOptimizedGraphState): Promise<Partial<SimplifiedOptimizedGraphState>> {
        const response = await this.responseService.generateResponse(
            state.userInput,
            this.formatHistoryForPrompt(state.messages)
        );
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

    private formatHistoryForPrompt(messages: BaseMessage[]): string {
        return messages.map(msg => {
            // CORRECCIÓN: Usar getType()
            const type = msg.getType();
            const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
            if (type === 'tool') {
                return `Tool Result (for ${(msg as any).name}): ${content}`;
            }
            return `${type}: ${content}`;
        }).join('\n\n');
    }
}