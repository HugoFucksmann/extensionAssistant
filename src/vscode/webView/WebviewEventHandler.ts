import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import { EventType, WindsurfEvent, ToolExecutionEventPayload, SystemEventPayload, ErrorOccurredEventPayload, UserInteractionRequiredPayload } from '../../features/events/eventTypes';
import { WebviewStateManager } from './WebviewStateManager';

export class WebviewEventHandler {
  private dispatcherSubscriptions: { unsubscribe: () => void }[] = [];

  constructor(
    private readonly internalEventDispatcher: InternalEventDispatcher,
    private readonly stateManager: WebviewStateManager,
    private readonly postMessage: (type: string, payload: any) => void
  ) {}

  public subscribeToEvents(): void {
    this.dispatcherSubscriptions.forEach(s => s.unsubscribe());
    this.dispatcherSubscriptions = [];

    const eventTypesToWatch: EventType[] = [
      EventType.TOOL_EXECUTION_STARTED,
      EventType.TOOL_EXECUTION_COMPLETED,
      EventType.TOOL_EXECUTION_ERROR,
      EventType.SYSTEM_ERROR,
      EventType.USER_INTERACTION_REQUIRED,
      EventType.RESPONSE_GENERATED,
    ];

    eventTypesToWatch.forEach(eventType => {
      this.dispatcherSubscriptions.push(
        this.internalEventDispatcher.subscribe(eventType, (event: WindsurfEvent) => 
          this.handleInternalEvent(event)
        )
      );
    });

    console.log('[WebviewEventHandler] Subscribed to events:', eventTypesToWatch.join(', '));
  }

  private handleInternalEvent(event: WindsurfEvent): void {
    const eventChatId = event.payload.chatId;
    const currentChatId = this.stateManager.getCurrentChatId();
    const currentOperationId = this.stateManager.getCurrentOperationId();

    if (event.type !== EventType.SYSTEM_ERROR && eventChatId && eventChatId !== currentChatId) {
      return;
    }

    let uiMessagePayload: any = {
      id: `event_${event.id || Date.now()}`,
      timestamp: event.timestamp || Date.now(),
      operationId: currentOperationId,
    };
    let uiMessageType: string | null = null;

    switch (event.type) {
      case EventType.TOOL_EXECUTION_STARTED:
        ({ uiMessageType, uiMessagePayload } = this.handleToolExecutionStarted(event.payload as ToolExecutionEventPayload, uiMessagePayload));
        break;

      case EventType.TOOL_EXECUTION_COMPLETED:
        ({ uiMessageType, uiMessagePayload } = this.handleToolExecutionCompleted(event.payload as ToolExecutionEventPayload, uiMessagePayload));
        break;

      case EventType.TOOL_EXECUTION_ERROR:
        ({ uiMessageType, uiMessagePayload } = this.handleToolExecutionError(event.payload as ToolExecutionEventPayload, uiMessagePayload));
        break;

      case EventType.SYSTEM_ERROR:
        ({ uiMessageType, uiMessagePayload } = this.handleSystemError(event.payload as SystemEventPayload | ErrorOccurredEventPayload, uiMessagePayload));
        break;

      case EventType.USER_INTERACTION_REQUIRED:
        ({ uiMessageType, uiMessagePayload } = this.handleUserInteractionRequired(event.payload as UserInteractionRequiredPayload, uiMessagePayload));
        break;

      case EventType.RESPONSE_GENERATED:
        ({ uiMessageType, uiMessagePayload } = this.handleResponseGenerated(event.payload as any, uiMessagePayload, currentChatId));
        break;

      default:
        return;
    }

    if (uiMessageType) {
      this.postMessage(uiMessageType, uiMessagePayload);
    }
  }

  private handleToolExecutionStarted(payload: ToolExecutionEventPayload, uiMessagePayload: any) {
    return {
      uiMessageType: 'agentActionUpdate',
      uiMessagePayload: {
        ...uiMessagePayload,
        content: payload.toolDescription || `Ejecutando ${payload.toolName || 'herramienta'}...`,
        status: 'tool_executing',
        toolName: payload.toolName,
        toolParams: payload.toolParams,
      }
    };
  }

  private handleToolExecutionCompleted(payload: ToolExecutionEventPayload, uiMessagePayload: any) {
    return {
      uiMessageType: 'agentActionUpdate',
      uiMessagePayload: {
        ...uiMessagePayload,
        content: payload.toolDescription ? 
          `${payload.toolDescription} finalizó.` : 
          `${payload.toolName || 'La herramienta'} finalizó.`,
        status: 'success',
        toolName: payload.toolName,
        toolParams: payload.toolParams,
        toolResult: payload.result,
      }
    };
  }

  private handleToolExecutionError(payload: ToolExecutionEventPayload, uiMessagePayload: any) {
    return {
      uiMessageType: 'agentActionUpdate',
      uiMessagePayload: {
        ...uiMessagePayload,
        content: `Error en ${payload.toolDescription || payload.toolName || 'herramienta'}: ${payload.error || 'desconocido'}`,
        status: 'error',
        toolName: payload.toolName,
        toolParams: payload.toolParams,
      }
    };
  }

  private handleSystemError(payload: SystemEventPayload | ErrorOccurredEventPayload, uiMessagePayload: any) {
    return {
      uiMessageType: 'systemError',
      uiMessagePayload: {
        ...uiMessagePayload,
        message: 'message' in payload ? payload.message : payload.errorMessage || 'Error inesperado del sistema.',
      }
    };
  }

  private handleUserInteractionRequired(payload: UserInteractionRequiredPayload, uiMessagePayload: any) {
    if (payload.interactionType === 'confirmation' && payload.title === 'Permission Required') {
      const toolNameMatch = payload.promptMessage.match(/Tool '([^']+)'/);
      const permissionMatch = payload.promptMessage.match(/permission: '([^']+)'/);
      
      this.postMessage('permissionRequest', {
        toolName: toolNameMatch ? toolNameMatch[1] : 'Unknown Tool',
        permission: permissionMatch ? permissionMatch[1] : 'Unknown Permission',
        description: payload.promptMessage,
        operationId: payload.uiOperationId
      });
      
      return { uiMessageType: null, uiMessagePayload };
    }
    
    return {
      uiMessageType: 'userInputRequired',
      uiMessagePayload: {
        ...uiMessagePayload,
        interactionType: payload.interactionType,
        promptMessage: payload.promptMessage,
        options: payload.options,
        placeholder: payload.placeholder,
        uiOperationId: payload.uiOperationId,
        operationId: payload.uiOperationId,
      }
    };
  }

  private handleResponseGenerated(payload: any, uiMessagePayload: any, currentChatId: string | null) {
    if (payload.isFinal && payload.chatId === currentChatId) {
      return {
        uiMessageType: 'assistantResponse',
        uiMessagePayload: {
          ...uiMessagePayload,
          content: payload.responseContent,
          operationId: payload.operationId || uiMessagePayload.operationId,
        }
      };
    }
    
    return { uiMessageType: null, uiMessagePayload };
  }

  public dispose(): void {
    this.dispatcherSubscriptions.forEach(s => s.unsubscribe());
    this.dispatcherSubscriptions = [];
  }
}