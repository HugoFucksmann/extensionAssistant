// WebviewEventAdapter.ts
import { InternalEventDispatcher } from '@core/events/InternalEventDispatcher';
import { EventType, WindsurfEvent } from '@features/events/eventTypes';
import { MessageFormatter } from '../formatters/MessageFormatter';

export class WebviewEventAdapter {
    private eventSubscriptions: { unsubscribe: () => void }[] = [];
    private currentChatId: string | null = null;

    constructor(
        private eventDispatcher: InternalEventDispatcher,
        private messageFormatter: MessageFormatter,
        private postMessage: (type: string, payload: any) => void
    ) { }

    setChatId(chatId: string): void {
        this.currentChatId = chatId;
    }

    subscribeToEvents(): void {
        this.unsubscribeAll();

        const eventTypes = [
            EventType.TOOL_EXECUTION_STARTED,
            EventType.TOOL_EXECUTION_COMPLETED,
            EventType.TOOL_EXECUTION_ERROR,
            EventType.SYSTEM_ERROR,
            EventType.RESPONSE_GENERATED,
            EventType.AGENT_PHASE_STARTED,
            EventType.AGENT_PHASE_COMPLETED,
            EventType.CONVERSATION_TURN_COMPLETED,
        ];

        eventTypes.forEach(eventType => {
            this.eventSubscriptions.push(
                this.eventDispatcher.subscribe(eventType, (event: WindsurfEvent) =>
                    this.handleEvent(event)
                )
            );
        });
    }

    private handleEvent(event: WindsurfEvent): void {
        // Filter events by current chat ID
        if (event.type !== EventType.SYSTEM_ERROR &&
            event.payload.chatId &&
            event.payload.chatId !== this.currentChatId) {
            return;
        }

        const result = this.processEvent(event);
        if (result) {
            this.postMessage(result.messageType, result.payload);
        }
    }

    private processEvent(event: WindsurfEvent): { messageType: string; payload: any } | null {
        const payload = event.payload as any;
        const baseMessage = this.messageFormatter.createBaseChatMessage(
            event.id,
            'system',
            payload.operationId
        );

        switch (event.type) {
            case EventType.TOOL_EXECUTION_STARTED:
                return this.createToolStartedMessage(event, baseMessage);
            case EventType.TOOL_EXECUTION_COMPLETED:
                return this.createToolCompletedMessage(event, baseMessage);
            case EventType.TOOL_EXECUTION_ERROR:
                return this.createToolErrorMessage(event, baseMessage);
            case EventType.RESPONSE_GENERATED:
                return this.createResponseMessage(event, baseMessage);
            case EventType.AGENT_PHASE_STARTED:
                return this.createPhaseStartedMessage(event, baseMessage);
            case EventType.AGENT_PHASE_COMPLETED:
                return this.createPhaseCompletedMessage(event, baseMessage);
            case EventType.SYSTEM_ERROR:
                return this.createSystemErrorMessage(event, baseMessage);
            case EventType.CONVERSATION_TURN_COMPLETED:
                return { messageType: 'turnCompleted', payload: {} };
            default:
                return null;
        }
    }

    private createToolStartedMessage(event: WindsurfEvent, baseMessage: any) {
        const payload = event.payload as any;
        baseMessage.content = this.messageFormatter.formatToolExecutionStarted(payload);
        baseMessage.metadata = {
            ...baseMessage.metadata,
            status: 'tool_executing',
            toolName: payload.toolName,
            toolInput: payload.parameters,
        };
        return { messageType: 'agentActionUpdate', payload: baseMessage };
    }

    private createToolCompletedMessage(event: WindsurfEvent, baseMessage: any) {
        const payload = event.payload as any;
        const formatted = this.messageFormatter.formatToolExecutionCompleted(payload);
        baseMessage.content = formatted.content;
        baseMessage.metadata = { ...baseMessage.metadata, ...formatted.metadata, status: 'success' };
        return { messageType: 'agentActionUpdate', payload: baseMessage };
    }

    private createToolErrorMessage(event: WindsurfEvent, baseMessage: any) {
        const payload = event.payload as any;
        const formatted = this.messageFormatter.formatToolExecutionError(payload);
        baseMessage.content = formatted.content;
        baseMessage.metadata = { ...baseMessage.metadata, ...formatted.metadata, status: 'error' };
        return { messageType: 'agentActionUpdate', payload: baseMessage };
    }

    private createResponseMessage(event: WindsurfEvent, baseMessage: any) {
        const payload = event.payload as any;
        baseMessage.sender = 'assistant';
        baseMessage.content = this.messageFormatter.formatResponseGenerated(payload);
        baseMessage.metadata = {
            ...baseMessage.metadata,
            status: 'success',
            processingTime: payload.duration,
            ...(payload.metadata || {})
        };
        return { messageType: 'assistantResponse', payload: baseMessage };
    }

    private createPhaseStartedMessage(event: WindsurfEvent, baseMessage: any) {
        const payload = event.payload as any;
        baseMessage.content = this.messageFormatter.formatAgentPhaseStarted(payload);
        baseMessage.metadata = {
            ...baseMessage.metadata,
            status: 'phase_started',
            phase: payload.phase,
            iteration: payload.iteration,
            source: payload.source
        };
        return { messageType: 'agentPhaseUpdate', payload: baseMessage };
    }

    private createPhaseCompletedMessage(event: WindsurfEvent, baseMessage: any) {
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
        return { messageType: 'agentPhaseUpdate', payload: baseMessage };
    }

    private createSystemErrorMessage(event: WindsurfEvent, baseMessage: any) {
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
        return { messageType: 'systemError', payload: baseMessage };
    }

    unsubscribeAll(): void {
        this.eventSubscriptions.forEach(s => s.unsubscribe());
        this.eventSubscriptions = [];
    }

    dispose(): void {
        this.unsubscribeAll();
    }
}