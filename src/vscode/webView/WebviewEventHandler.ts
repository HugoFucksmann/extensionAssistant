// src/vscode/webView/WebviewEventHandler.ts
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import {
  EventType,
  WindsurfEvent,
  ToolExecutionEventPayload,
  SystemEventPayload,
  ErrorOccurredEventPayload,
  UserInteractionRequiredPayload, // Se mantiene por si hay otros usos, pero no para permisos
  ResponseEventPayload, // Asumiendo que ResponseEventPayload tiene responseContent
} from '../../features/events/eventTypes';
import { WebviewStateManager } from './WebviewStateManager';
import { ChatMessage } from '../../shared/types'; // Asegúrate que la ruta sea correcta

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
      EventType.SYSTEM_ERROR, // Para errores generales del sistema
      // EventType.USER_INTERACTION_REQUIRED, // Eliminado si askUser usa diálogos nativos
      EventType.RESPONSE_GENERATED, // Para respuestas del asistente
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

    // Solo procesar eventos para el chat actual, excepto errores del sistema que son globales
    if (event.type !== EventType.SYSTEM_ERROR && eventChatId && eventChatId !== currentChatId) {
      console.log(`[WebviewEventHandler] Ignoring event for different chat. Event ChatID: ${eventChatId}, Current ChatID: ${currentChatId}`);
      return;
    }

    let chatMessage: ChatMessage | null = null;
    let messageType: string | null = null;

    switch (event.type) {
      case EventType.TOOL_EXECUTION_STARTED:
        chatMessage = this.handleToolExecutionStarted(event.payload as ToolExecutionEventPayload, event.id);
        messageType = 'agentActionUpdate';
        break;

      case EventType.TOOL_EXECUTION_COMPLETED:
        chatMessage = this.handleToolExecutionCompleted(event.payload as ToolExecutionEventPayload, event.id);
        messageType = 'agentActionUpdate';
        break;

      case EventType.TOOL_EXECUTION_ERROR:
        chatMessage = this.handleToolExecutionError(event.payload as ToolExecutionEventPayload, event.id);
        messageType = 'agentActionUpdate';
        break;

      case EventType.SYSTEM_ERROR:
        chatMessage = this.handleSystemError(event.payload as SystemEventPayload | ErrorOccurredEventPayload, event.id);
        messageType = 'systemError';
        break;

      // case EventType.USER_INTERACTION_REQUIRED:
      //   // Si askUser usa diálogos nativos, no necesitamos enviar un mensaje de chat aquí.
      //   // Si askUser AÚN necesita interactuar con la UI del chat, este caso se reactivaría
      //   // para enviar un ChatMessage de sender: 'assistant' con la pregunta.
      //   // Por ahora, lo comentamos asumiendo la simplificación.
      //   // chatMessage = this.handleUserInteractionRequired(event.payload as UserInteractionRequiredPayload, event.id);
      //   break;

      case EventType.RESPONSE_GENERATED:
        // Solo procesar si es una respuesta final para el chat actual
        const responsePayload = event.payload as ResponseEventPayload; // Asumiendo que tiene responseContent, isFinal
        if (responsePayload.isFinal && responsePayload.chatId === currentChatId) {
          chatMessage = this.handleResponseGenerated(responsePayload, event.id);
          messageType = 'assistantResponse';
        }
        break;

      default:
        console.warn('[WebviewEventHandler] Unhandled event type:', event.type);
        return;
    }

    if (chatMessage && messageType) {
      this.postMessage(messageType, chatMessage);
    }
  }

  private createBaseChatMessage(eventId: string, sender: ChatMessage['sender']): Partial<ChatMessage> {
    return {
      id: `msg_${eventId || Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      sender: sender,
    };
  }

  private handleToolExecutionStarted(payload: ToolExecutionEventPayload, eventId: string): ChatMessage {
    return {
      ...this.createBaseChatMessage(eventId, 'system'),
      content: payload.toolDescription || `Ejecutando ${payload.toolName || 'herramienta'}...`,
      metadata: {
        status: 'tool_executing',
        toolName: payload.toolName,
        toolInput: payload.toolParams, // O `payload.parameters` si es más apropiado
      },
    } as ChatMessage;
  }

  private handleToolExecutionCompleted(payload: ToolExecutionEventPayload, eventId: string): ChatMessage {
    let content = payload.toolDescription
      ? `${payload.toolDescription} finalizó.`
      : `${payload.toolName || 'La herramienta'} finalizó.`;

    // Opcionalmente, añadir un breve resumen del resultado si es simple
    if (payload.result && typeof payload.result === 'string' && payload.result.length < 100) {
      content += ` Resultado: ${payload.result}`;
    } else if (payload.result && typeof payload.result === 'object' && payload.result.message && typeof payload.result.message === 'string') {
      content += ` ${payload.result.message}`;
    }

    return {
      ...this.createBaseChatMessage(eventId, 'system'),
      content: content,
      metadata: {
        status: 'success',
        toolName: payload.toolName,
        toolInput: payload.toolParams,
        toolOutput: payload.result, // Puede ser útil para la UI mostrar detalles
      },
    } as ChatMessage;
  }

  private handleToolExecutionError(payload: ToolExecutionEventPayload, eventId: string): ChatMessage {
    return {
      ...this.createBaseChatMessage(eventId, 'system'),
      content: `Error en ${payload.toolDescription || payload.toolName || 'herramienta'}: ${payload.error || 'Error desconocido'}`,
      metadata: {
        status: 'error',
        toolName: payload.toolName,
        toolInput: payload.toolParams,
        error: payload.error,
      },
    } as ChatMessage;
  }

  private handleSystemError(payload: SystemEventPayload | ErrorOccurredEventPayload, eventId: string): ChatMessage {
    const errorMessage = 'message' in payload ? payload.message : payload.errorMessage;
    return {
      ...this.createBaseChatMessage(eventId, 'system'),
      content: `Error del sistema: ${errorMessage || 'Error inesperado.'}`,
      metadata: {
        status: 'error',
        details: 'details' in payload ? payload.details : undefined,
      },
    } as ChatMessage;
  }

  private handleResponseGenerated(payload: ResponseEventPayload, eventId: string): ChatMessage {
    return {
      ...this.createBaseChatMessage(eventId, 'assistant'),
      content: payload.responseContent,
      metadata: {
        status: 'success', // O el estado que venga en el payload.metadata
        isFinalToolResponse: payload.metadata?.isFinalToolResponse, // Si este metadato es relevante
        ...(payload.metadata || {}), // Incluir otros metadatos del payload de respuesta
      },
    } as ChatMessage;
  }



  public dispose(): void {
    this.dispatcherSubscriptions.forEach(s => s.unsubscribe());
    this.dispatcherSubscriptions = [];
    console.log('[WebviewEventHandler] Disposed and subscriptions cleared.');
  }
}