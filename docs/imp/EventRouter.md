// src/vscode/services/EventRouter.ts
import * as vscode from 'vscode';
import { EventBus } from '@features/events/EventBus';
import { EventType, WindsurfEvent, ResponseEventPayload, ToolExecutionEventPayload, ConversationStartedPayload, ErrorOccurredPayload, SystemEventPayload } from '@features/events/eventTypes';

export class EventRouter {
  private disposables: vscode.Disposable[] = [];
  private eventBus: EventBus;

  constructor(
    private postMessageToWebview: (type: string, payload: any) => void,
    private getCurrentChatId: () => string | undefined
  ) {
    this.eventBus = EventBus.getInstance();
  }

  setup(): void {
    const eventTypesToRoute = [
      EventType.RESPONSE_GENERATED,
      EventType.TOOL_EXECUTION_STARTED,
      EventType.TOOL_EXECUTION_COMPLETED,
      EventType.TOOL_EXECUTION_ERROR,
      EventType.CONVERSATION_STARTED,
      EventType.ERROR_OCCURRED,
      EventType.SYSTEM_INFO,
      EventType.SYSTEM_WARNING,
    ];

    eventTypesToRoute.forEach(eventType => {
      const listener = (event: WindsurfEvent) => this.routeEvent(event);
      this.eventBus.onEvent(eventType, listener);
      this.disposables.push({ 
        dispose: () => this.eventBus.off(eventType, listener as any) 
      });
    });
  }

  private routeEvent(event: WindsurfEvent<any>): void {
    const currentChatId = this.getCurrentChatId();

    // Filter events for inactive chats (except system events)
    if (event.payload?.chatId && currentChatId && event.payload.chatId !== currentChatId) {
      if (![EventType.SYSTEM_ERROR, EventType.SYSTEM_INFO, EventType.SYSTEM_WARNING].includes(event.type)) {
        return;
      }
    }

    switch (event.type) {
      case EventType.RESPONSE_GENERATED:
        this.handleResponseGenerated(event.payload as ResponseEventPayload, event.timestamp);
        break;
      case EventType.TOOL_EXECUTION_STARTED:
      case EventType.TOOL_EXECUTION_COMPLETED:
      case EventType.TOOL_EXECUTION_ERROR:
        this.handleToolExecution(event);
        break;
      case EventType.CONVERSATION_STARTED:
        this.handleConversationStarted(event.payload as ConversationStartedPayload);
        break;
      case EventType.ERROR_OCCURRED:
        this.handleErrorOccurred(event.payload as ErrorOccurredPayload);
        break;
      case EventType.SYSTEM_ERROR:
      case EventType.SYSTEM_INFO:
      case EventType.SYSTEM_WARNING:
        this.handleSystemEvent(event);
        break;
    }
  }

  private handleResponseGenerated(payload: ResponseEventPayload, timestamp: number): void {
    this.postMessageToWebview('extension:assistantResponse', {
      id: `asst_${Date.now()}`,
      content: payload.response,
      sender: 'assistant',
      timestamp,
      metadata: { processingTime: payload.duration },
      chatId: payload.chatId
    });
  }

  private handleToolExecution(event: WindsurfEvent): void {
    const payload = event.payload as ToolExecutionEventPayload;
    let status: 'started' | 'completed' | 'error' = 'started';
    
    if (event.type === EventType.TOOL_EXECUTION_COMPLETED) status = 'completed';
    if (event.type === EventType.TOOL_EXECUTION_ERROR) status = 'error';

    this.postMessageToWebview('extension:processingUpdate', {
      type: 'UPDATE_TOOL',
      payload: { tool: payload.tool, status, data: payload },
      chatId: payload.chatId
    });
  }

  private handleConversationStarted(payload: ConversationStartedPayload): void {
    this.postMessageToWebview('extension:processingUpdate', {
      type: 'SET_PHASE',
      payload: 'conversation_started',
      chatId: payload.chatId
    });
  }

  private handleErrorOccurred(payload: ErrorOccurredPayload): void {
    this.postMessageToWebview('extension:systemError', {
      message: payload.error || 'Unknown application error',
      source: payload.source || 'BackendApplication',
      details: payload.details,
      stack: payload.stack,
      chatId: payload.chatId
    });
  }

  private handleSystemEvent(event: WindsurfEvent): void {
    const payload = event.payload as SystemEventPayload;
    let messageType = 'extension:systemInfo';
    
    if (event.type === EventType.SYSTEM_ERROR) messageType = 'extension:systemError';
    if (event.type === EventType.SYSTEM_WARNING) messageType = 'extension:systemWarning';

    this.postMessageToWebview(messageType, {
      message: payload.message,
      details: payload.details,
      source: payload.source,
      level: payload.level,
      error: payload.error,
      stack: payload.stack,
      chatId: payload.chatId
    });
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}