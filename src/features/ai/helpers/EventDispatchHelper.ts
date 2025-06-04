// src/core/helpers/EventDispatchHelper.ts

import { InternalEventDispatcher } from "@core/events/InternalEventDispatcher";
import { AgentPhaseEventPayload, EventType, ToolExecutionEventPayload } from "@features/events/eventTypes";
import { ToolRegistry } from "@features/tools/ToolRegistry";
import { ToolResult as InternalToolResult } from '@features/tools/types';


export class EventDispatchHelper {
    constructor(private dispatcher: InternalEventDispatcher) { }

    dispatchAgentPhase(
        phase: AgentPhaseEventPayload['phase'],
        status: 'started' | 'completed',
        chatId: string,
        iterationCount: number,
        data?: any,
        error?: string
    ): void {
        const eventType = status === 'started'
            ? EventType.AGENT_PHASE_STARTED
            : EventType.AGENT_PHASE_COMPLETED;

        const payload: AgentPhaseEventPayload = {
            phase,
            chatId,
            data,
            error,
            source: 'OptimizedReActEngine', // Or more specific if needed
            timestamp: Date.now(),
            iteration: iterationCount
        };
        this.dispatcher.dispatch(eventType, payload);
    }

    dispatchToolExecutionEvent(
        toolRegistry: ToolRegistry, // Pass ToolRegistry to get description
        toolName: string,
        parameters: any,
        toolResult: InternalToolResult,
        actionResult: any, // Model's analysis of the tool result
        chatId: string,
        operationId: string,
        duration: number
    ): void {
        const toolDescription = toolRegistry.getTool(toolName)?.description;

        const finalToolEventPayload: ToolExecutionEventPayload = {
            toolName,
            parameters: parameters ?? undefined,
            toolDescription: toolDescription || `Description for ${toolName} not found`,
            rawOutput: toolResult.data,
            error: toolResult.error,
            duration,
            isProcessingStep: false, // This might need adjustment based on context
            modelAnalysis: actionResult,
            toolSuccess: toolResult.success,
            chatId,
            source: 'OptimizedReActEngine.ReActIterationEngine', // Be specific
            operationId,
            timestamp: Date.now()
        };

        const eventType = toolResult.success
            ? EventType.TOOL_EXECUTION_COMPLETED
            : EventType.TOOL_EXECUTION_ERROR;

        this.dispatcher.dispatch(eventType, finalToolEventPayload);
    }
}