// src/vscode/webView/handlers/EventSubscriber.ts
import { InternalEventDispatcher } from '../../../core/events/InternalEventDispatcher';
import { EventType, WindsurfEvent } from '../../../features/events/eventTypes';
import { MessageFormatter } from '../formatters/MessageFormatter';
import { ChatMessage } from '../../../features/chat/types';

export class EventSubscriber {
    private subscriptions: { unsubscribe: () => void }[] = [];
    private currentChatId: string | null = null;

    constructor(
        private readonly internalEventDispatcher: InternalEventDispatcher,
        private readonly messageFormatter: MessageFormatter,
        private readonly postMessage: (type: string, payload: any) => void
    ) { }

    public setCurrentChatId(chatId: string): void {
        this.currentChatId = chatId;
    }

    public subscribeToEvents(): void {
        this.unsubscribeAll();

        const eventTypesToWatch: EventType[] = [
            EventType.TOOL_EXECUTION_STARTED,
            EventType.TOOL_EXECUTION_COMPLETED,
            EventType.TOOL_EXECUTION_ERROR,
            EventType.SYSTEM_ERROR,
            EventType.RESPONSE_GENERATED,
            EventType.AGENT_PHASE_STARTED,
            EventType.AGENT_PHASE_COMPLETED,
        ];

        eventTypesToWatch.forEach(eventType => {
            this.subscriptions.push(
                this.internalEventDispatcher.subscribe(eventType, (event: WindsurfEvent) =>
                    this.handleEvent(event)
                )
            );
        });

        console.log('[EventSubscriber] Subscribed to events:', eventTypesToWatch.join(', '));
    }

    private handleEvent(event: WindsurfEvent): void {
        // Skip events for different chat sessions (except system errors)
        if (event.type !== EventType.SYSTEM_ERROR &&
            event.payload.chatId &&
            event.payload.chatId !== this.currentChatId) {
            return;
        }

        const result = this.processEvent(event);
        if (result) {
            this.postMessage(result.messageType, result.chatMessage);
        }
    }

    private processEvent(event: WindsurfEvent): { messageType: string; chatMessage: ChatMessage } | null {
        const payload = event.payload as any;
        // Pass operationId to ensure message ID is consistent for tool updates
        const baseMessage = this.messageFormatter.createBaseChatMessage(event.id, 'system', payload.operationId) as ChatMessage;

        switch (event.type) {
            case EventType.TOOL_EXECUTION_STARTED:
                return this.handleToolExecutionStarted(event, baseMessage);
            case EventType.TOOL_EXECUTION_COMPLETED:
                return this.handleToolExecutionCompleted(event, baseMessage);
            case EventType.TOOL_EXECUTION_ERROR:
                return this.handleToolExecutionError(event, baseMessage);
            case EventType.RESPONSE_GENERATED:
                return this.handleResponseGenerated(event, baseMessage);
            case EventType.AGENT_PHASE_STARTED:
                return this.handleAgentPhaseStarted(event, baseMessage);
            case EventType.AGENT_PHASE_COMPLETED:
                return this.handleAgentPhaseCompleted(event, baseMessage);
            case EventType.SYSTEM_ERROR:
                return this.handleSystemError(event, baseMessage);
            default:
                return null;
        }
    }

    private handleToolExecutionStarted(event: WindsurfEvent, baseMessage: ChatMessage): { messageType: string; chatMessage: ChatMessage } {
        const payload = event.payload as any;
        baseMessage.content = this.messageFormatter.formatToolExecutionStarted(payload);
        baseMessage.metadata = {
            ...baseMessage.metadata,
            status: 'tool_executing',
            toolName: payload.toolName,
            toolInput: payload.parameters,
        };
        // baseMessage.id and baseMessage.operationId are already set correctly by createBaseChatMessage
        return { messageType: 'agentActionUpdate', chatMessage: baseMessage };
    }

    private handleToolExecutionCompleted(event: WindsurfEvent, baseMessage: ChatMessage): { messageType: string; chatMessage: ChatMessage } {
        const payload = event.payload as any;
        const formatted = this.messageFormatter.formatToolExecutionCompleted(payload);

        // Modify the baseMessage directly to ensure the ID (which is the operationId) is preserved for the update.
        baseMessage.content = formatted.content;
        baseMessage.metadata = {
            ...baseMessage.metadata,
            ...formatted.metadata,
            status: 'success' // Ensure status is success
        };

        return { messageType: 'agentActionUpdate', chatMessage: baseMessage };
    }

    private handleToolExecutionError(event: WindsurfEvent, baseMessage: ChatMessage): { messageType: string; chatMessage: ChatMessage } {
        const payload = event.payload as any;
        const formatted = this.messageFormatter.formatToolExecutionError(payload);

        // Modify the baseMessage directly to ensure the ID (the operationId) is preserved for the update.
        baseMessage.content = formatted.content;
        baseMessage.metadata = {
            ...baseMessage.metadata,
            ...formatted.metadata,
            status: 'error' // Ensure status is error
        };

        return { messageType: 'agentActionUpdate', chatMessage: baseMessage };
    }

    private handleResponseGenerated(event: WindsurfEvent, baseMessage: ChatMessage): { messageType: string; chatMessage: ChatMessage } {
        const payload = event.payload as any;
        baseMessage.sender = 'assistant';
        baseMessage.content = this.messageFormatter.formatResponseGenerated(payload);
        baseMessage.metadata = {
            ...baseMessage.metadata,
            status: 'success',
            processingTime: payload.duration,
            ...(payload.metadata || {})
        };
        return { messageType: 'assistantResponse', chatMessage: baseMessage };
    }

    private handleAgentPhaseStarted(event: WindsurfEvent, baseMessage: ChatMessage): { messageType: string; chatMessage: ChatMessage } {
        const payload = event.payload as any;
        baseMessage.content = this.messageFormatter.formatAgentPhaseStarted(payload);
        baseMessage.metadata = {
            ...baseMessage.metadata,
            status: 'phase_started',
            phase: payload.phase,
            iteration: payload.iteration,
            source: payload.source
        };
        return { messageType: 'agentPhaseUpdate', chatMessage: baseMessage };
    }

    private handleAgentPhaseCompleted(event: WindsurfEvent, baseMessage: ChatMessage): { messageType: string; chatMessage: ChatMessage } {
        const payload = event.payload as any;
        baseMessage.content = this.messageFormatter.formatAgentPhaseCompleted(payload);
        baseMessage.metadata = {
            ...baseMessage.metadata,
            status: 'phase_completed',
            phase: payload.phase,
            iteration: payload.iteration,
            source: payload.source,
            phaseData: payload.data
        };
        return { messageType: 'agentPhaseUpdate', chatMessage: baseMessage };
    }

    private handleSystemError(event: WindsurfEvent, baseMessage: ChatMessage): { messageType: string; chatMessage: ChatMessage } {
        const payload = event.payload as any;
        baseMessage.content = this.messageFormatter.formatSystemError(payload);
        baseMessage.metadata = {
            ...baseMessage.metadata,
            status: 'error',
            details: payload.details,
            errorObject: payload.errorObject,
            source: payload.source,
            level: payload.level || 'error'
        };
        return { messageType: 'systemError', chatMessage: baseMessage };
    }

    public unsubscribeAll(): void {
        this.subscriptions.forEach(s => s.unsubscribe());
        this.subscriptions = [];
    }

    public dispose(): void {
        this.unsubscribeAll();
        console.log('[EventSubscriber] Disposed and subscriptions cleared.');
    }
}