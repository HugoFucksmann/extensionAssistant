// src/core/EventManager.ts
import { InternalEventDispatcher } from './events/InternalEventDispatcher';
import { EventType, AgentPhaseEventPayload, ResponseEventPayload, ToolExecutionEventPayload } from '../features/events/eventTypes';
import { WindsurfState } from './types';
import { InternalToolResult } from '../features/tools/types';

export class EventManager {
  constructor(private dispatcher: InternalEventDispatcher) {}

  /**
   * Dispatch agent phase events
   */
  dispatchPhaseEvent(
    phase: AgentPhaseEventPayload['phase'],
    status: 'started' | 'completed',
    chatId: string | null,
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
      source: 'OptimizedReActEngine',
      timestamp: Date.now(),
      iteration: iterationCount
    };
    
    this.dispatcher.dispatch(eventType, payload);
  }

  /**
   * Dispatch tool execution completion event
   */
  dispatchToolCompletion(
    toolName: string,
    parameters: any,
    chatId: string | null,
    operationId: string,
    result: InternalToolResult,
    duration: number,
    toolDescription?: string,
    modelAnalysis?: any
  ): void {
    const payload: ToolExecutionEventPayload = {
      toolName,
      parameters: parameters ?? undefined,
      chatId,
      source: 'OptimizedReActEngine',
      operationId,
      timestamp: Date.now(),
      result: result.mappedOutput,
      duration,
      toolDescription,
      toolParams: parameters ?? undefined,
      isProcessingStep: false,
      modelAnalysis,
      rawToolOutput: result.data,
      toolSuccess: result.success,
    };

    const eventType = result.success 
      ? EventType.TOOL_EXECUTION_COMPLETED 
      : EventType.TOOL_EXECUTION_ERROR;

    if (!result.success) {
      (payload as any).error = result.error || "Tool execution failed";
    }

    this.dispatcher.dispatch(eventType, payload);
  }

  /**
   * Dispatch system error event
   */
  dispatchSystemError(
    message: string,
    chatId: string | null,
    error: Error,
    details?: any
  ): void {
    this.dispatcher.dispatch(EventType.SYSTEM_ERROR, {
      message: `Error in OptimizedReActEngine: ${message}`,
      level: 'error',
      chatId,
      details: { error: error.stack || error.toString(), ...details },
      source: 'OptimizedReActEngine',
      timestamp: Date.now()
    });
  }

  /**
   * Dispatch final response event
   */
  dispatchFinalResponse(
    responseContent: string,
    chatId: string | null,
    duration: number,
    metadata: any = {}
  ): void {
    const payload: ResponseEventPayload = {
      responseContent,
      isFinal: true,
      chatId,
      source: 'OptimizedReActEngine',
      timestamp: Date.now(),
      duration,
      metadata
    };
    
    this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, payload);
  }
}