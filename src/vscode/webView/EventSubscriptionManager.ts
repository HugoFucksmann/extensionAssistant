// src/vscode/webView/EventSubscriptionManager.ts
// import { eventBus } from '../../features/events/EventBus'; // Ya no se usa el singleton global
import { EventType, WindsurfEvent, ConversationEndedPayload, ResponseEventPayload, ErrorEventPayload, ToolExecutionEventPayload, ReActEventPayload } from '../../features/events/eventTypes';
import { SessionManager } from './SessionManager';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher'; // Nueva importación
import { ProcessingStatus as SharedProcessingStatus, ToolExecution as SharedToolExecution } from '@shared/types'; // Importar tipos compartidos

// Mantener la interfaz local si es ligeramente diferente o para desacoplar
interface ProcessingStatusUI extends SharedProcessingStatus {
  // Campos adicionales específicos para la UI si los hubiera
}
interface ToolStatusUI extends SharedToolExecution {
  // Campos adicionales específicos para la UI si los hubiera
}


export class EventSubscriptionManager {
  private processingStatus: ProcessingStatusUI = {
    phase: '',
    status: 'inactive',
    tools: [],
    metrics: {}, // Asegúrate que metrics exista en ProcessingStatusUI o SharedProcessingStatus
  };
  private subscriptions: Array<{ unsubscribe: () => void }> = []; // Para guardar las suscripciones

  constructor(
    private sessionManager: SessionManager,
    private postMessageToUI: (type: string, payload: any) => void,
    private dispatcher: InternalEventDispatcher // Inyectar el dispatcher
  ) {
    console.log('[EventSubscriptionManager] Initialized with InternalEventDispatcher.');
  }

  public setupEventListeners(): void {
    this.subscribeToConversationEvents();
    this.subscribeToResponseEvents();
    this.subscribeToErrorEvents();
    this.subscribeToToolEvents();
    this.subscribeToReActEvents(); // Para actualizaciones de fase más granulares
    // ... otras suscripciones ...

    console.log('[EventSubscriptionManager] Event listeners set up.');
  }

  private addSubscription(subscription: { unsubscribe: () => void }) {
    this.subscriptions.push(subscription);
  }

  private subscribeToConversationEvents(): void {
    this.addSubscription(
      this.dispatcher.subscribe(EventType.CONVERSATION_STARTED, (event: WindsurfEvent) => {
        if (!this.isEventForCurrentChat(event)) return;

        this.processingStatus = {
          phase: 'conversation_started',
          status: 'active',
          startTime: event.timestamp,
          tools: [],
          metrics: {}, // Reiniciar métricas
        };
        this.postMessageToUI('processingUpdate', this.processingStatus);
      })
    );

    this.addSubscription(
      this.dispatcher.subscribe(EventType.CONVERSATION_ENDED, (event: WindsurfEvent) => {
        // Este evento puede ser para el chat actual o para uno anterior si se inicia uno nuevo
        const payload = event.payload as ConversationEndedPayload & { cleared?: boolean, newChatId?: string };
        const currentChatId = this.sessionManager.getCurrentChatId();

        // Si el evento es para el chat que *acaba* de ser limpiado
        // y la UI ya cambió a un nuevo chat, no actualices el processingStatus del chat viejo.
        if (payload.chatId !== currentChatId && payload.cleared && payload.newChatId) {
            // El chat anterior fue limpiado, la UI ya debería estar en newChatId
            // No necesitamos hacer un processingUpdate para el chatId viejo.
            // La UI podría haber recibido 'newChatStarted' directamente.
            console.log(`[EventSubscriptionManager] Conversation ${payload.chatId} ended (cleared), UI now on ${payload.newChatId}.`);
            return;
        }

        if (!this.isEventForCurrentChat(event) && !payload.cleared) return; // Si no es cleared, debe ser para el chat actual

        this.processingStatus.phase = 'conversation_ended';
        this.processingStatus.status = payload.cleared ? 'inactive' : 'completed';

        if (this.processingStatus.startTime && !payload.cleared && this.processingStatus.metrics) { 
          this.processingStatus.metrics.totalDuration = Date.now() - this.processingStatus.startTime;
        }

        this.postMessageToUI('processingUpdate', this.processingStatus);

        if (payload.cleared) {
            // Si la conversación se limpió, la UI podría necesitar un mensaje específico
            // como 'chatCleared' o 'newChatStarted' si se proporcionó un newChatId.
            // WebviewProvider podría estar enviando 'newChatStarted' directamente.
            // Si no, aquí se podría enviar 'chatCleared'.
            this.postMessageToUI('chatCleared', { oldChatId: payload.chatId });
            if (payload.newChatId) {
                 // Si WebviewProvider no lo hizo, aquí se podría enviar.
                 // this.postMessageToUI('newChatStarted', { chatId: payload.newChatId });
            }
        }
      })
    );
  }

  private subscribeToResponseEvents(): void {
    this.addSubscription(
      this.dispatcher.subscribe(EventType.RESPONSE_GENERATED, (event: WindsurfEvent) => {
        if (!this.isEventForCurrentChat(event)) return;
        const payload = event.payload as ResponseEventPayload;
  
        console.log('[EventSubscriptionManager] RESPONSE_GENERATED for current chat');
  
        this.postMessageToUI('assistantResponse', {
          chatId: this.sessionManager.getCurrentChatId(),
          id: `asst_${event.id || Date.now()}`,
          content: payload.response, // Mensaje del modelo
          sender: 'assistant',
          timestamp: event.timestamp,
          metadata: {
            processingTime: payload.duration,
            tools: this.processingStatus.tools.map(t => ({ ...t })),
            // ... otros metadatos si los tienes
          },
        });
  
        this.processingStatus.phase = 'response_delivered';
        this.processingStatus.status = 'completed';
        if (this.processingStatus.startTime && this.processingStatus.metrics) {
          this.processingStatus.metrics.totalDuration = Date.now() - this.processingStatus.startTime;
        }
        this.postMessageToUI('processingUpdate', this.processingStatus);
      })
    );
  }

  private subscribeToErrorEvents(): void {
    this.addSubscription(
      this.dispatcher.subscribe(EventType.ERROR_OCCURRED, (event: WindsurfEvent) => {
        const payload = event.payload as ErrorEventPayload;
        // Si el error tiene un chatId y no es para el chat actual, ignorarlo (a menos que sea un error global sin chatId)
        if (payload.chatId && !this.isEventForCurrentChat(event)) return;

        console.error('[EventSubscriptionManager] ERROR_OCCURRED', payload);

        this.postMessageToUI('systemError', {
          message: payload.error || payload.message || 'An unknown error occurred.',
          source: payload.source || 'UnknownSource',
          details: payload.stack, // O cualquier otro detalle relevante
        });

        // Actualizar estado de procesamiento solo si el error está vinculado al chat actual
        // o es un error que debe detener el procesamiento actual.
        if (!payload.chatId || this.isEventForCurrentChat(event)) {
            this.processingStatus.phase = 'error_occurred';
            this.processingStatus.status = 'error';
            // @ts-ignore // Añadir error al processingStatus si tu tipo lo permite
            this.processingStatus.error = payload.error || payload.message;
            this.postMessageToUI('processingUpdate', this.processingStatus);
        }
      })
    );
  }

  private subscribeToToolEvents(): void {
    this.addSubscription(
      this.dispatcher.subscribe(EventType.TOOL_EXECUTION_STARTED, (event: WindsurfEvent) => {
        if (!this.isEventForCurrentChat(event)) return;
        const payload = event.payload as ToolExecutionEventPayload;
        const toolName = payload.tool || 'unknown_tool';

        const existingTool = this.processingStatus.tools.find(t => t.name === toolName && t.status === 'started');
        if (existingTool) { // Evitar duplicados si el evento se emite varias veces
            return;
        }

        this.processingStatus.tools.push({
          name: toolName,
          status: 'started',
          startTime: event.timestamp,
          parameters: payload.parameters,
          // result y error se llenarán después
        } as ToolStatusUI); // Cast a tu tipo local

        this.processingStatus.phase = `tool_started:${toolName}`;
        this.processingStatus.status = 'active'; // Asegurar que el estado general sea activo
        this.postMessageToUI('processingUpdate', this.processingStatus);
      })
    );

    this.addSubscription(
      this.dispatcher.subscribe(EventType.TOOL_EXECUTION_COMPLETED, (event: WindsurfEvent) => {
        if (!this.isEventForCurrentChat(event)) return;
        const payload = event.payload as ToolExecutionEventPayload;
        const toolName = payload.tool || 'unknown_tool';
        const tool = this.processingStatus.tools.find(t => t.name === toolName && t.status === 'started');

        if (tool) {
          tool.status = 'completed';
          tool.endTime = event.timestamp;
          tool.result = payload.result;
        } else {
            console.warn(`[EventSubscriptionManager] Received TOOL_EXECUTION_COMPLETED for tool '${toolName}' not in 'started' state or not found.`);
            // Podrías añadirlo si no existe, pero es inusual
            this.processingStatus.tools.push({
                name: toolName, status: 'completed', startTime: event.timestamp - (payload.duration || 0), endTime: event.timestamp,
                parameters: payload.parameters, result: payload.result
            } as ToolStatusUI);
        }
        this.processingStatus.phase = `tool_completed:${toolName}`;
        this.postMessageToUI('processingUpdate', this.processingStatus);
      })
    );

    this.addSubscription(
      this.dispatcher.subscribe(EventType.TOOL_EXECUTION_ERROR, (event: WindsurfEvent) => {
        if (!this.isEventForCurrentChat(event)) return;
        const payload = event.payload as ToolExecutionEventPayload;
        const toolName = payload.tool || 'unknown_tool';
        const tool = this.processingStatus.tools.find(t => t.name === toolName && t.status === 'started');

        if (tool) {
          tool.status = 'error';
          tool.endTime = event.timestamp;
          tool.error = payload.error;
        } else {
            console.warn(`[EventSubscriptionManager] Received TOOL_EXECUTION_ERROR for tool '${toolName}' not in 'started' state or not found.`);
             this.processingStatus.tools.push({
                name: toolName, status: 'error', startTime: event.timestamp - (payload.duration || 0), endTime: event.timestamp,
                parameters: payload.parameters, error: payload.error
            } as ToolStatusUI);
        }
        this.processingStatus.phase = `tool_error:${toolName}`;
        this.postMessageToUI('processingUpdate', this.processingStatus);
      })
    );
  }

  private subscribeToReActEvents(): void {
    const reactEventTypes: EventType[] = [
        EventType.REASONING_STARTED, EventType.REASONING_COMPLETED,
        // ACTION_STARTED y COMPLETED ya se manejan en toolEvents si la acción es una herramienta
        EventType.REFLECTION_STARTED, EventType.REFLECTION_COMPLETED,
        EventType.CORRECTION_STARTED, EventType.CORRECTION_COMPLETED,
        EventType.NODE_START, EventType.NODE_COMPLETE, EventType.NODE_ERROR, // Eventos genéricos de nodo
    ];

    this.addSubscription(
        this.dispatcher.subscribe(reactEventTypes, (event: WindsurfEvent) => {
            if (!this.isEventForCurrentChat(event)) return;
            const payload = event.payload as ReActEventPayload; // O NodeEventPayload

            this.processingStatus.phase = payload.phase || payload.nodeType || event.type;
            this.processingStatus.status = event.type.endsWith(':error') || event.type.endsWith('_ERROR') ? 'error' : 'active';

            if (event.type === EventType.NODE_COMPLETE && payload.nodeType === 'ReActGraphExecution') {
                this.processingStatus.status = 'completed'; // El grafo completo terminó
            }
            if (event.type === EventType.NODE_ERROR && payload.nodeType === 'ReActGraphExecution') {
                this.processingStatus.status = 'error';
            }

            // Podrías añadir más detalles al processingStatus.metrics o a un log específico de fases
            // this.processingStatus.metrics[event.type] = payload.duration || (Date.now() - event.timestamp);

            this.postMessageToUI('processingUpdate', this.processingStatus);
        })
    );
  }


  private isEventForCurrentChat(event: WindsurfEvent): boolean {
    const currentChatId = this.sessionManager.getCurrentChatId();
    if (!currentChatId) return false; // No hay chat activo, no procesar eventos específicos de chat

    const payloadChatId = (event.payload as any)?.chatId;

    // Si el evento no tiene chatId, se asume global o relevante para el activo.
    // O podrías decidir que los eventos SIN chatId no deben afectar el 'processingStatus' de un chat específico.
    if (typeof payloadChatId === 'undefined') {
      // console.debug(`[EventSubscriptionManager] Event ${event.type} has no chatId, assuming relevant for active chat ${currentChatId}.`);
      return true; // O false, dependiendo de tu política para eventos sin chatId
    }

    return payloadChatId === currentChatId;
  }

  public dispose(): void {
    console.log('[EventSubscriptionManager] Disposing subscriptions...');
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    console.log('[EventSubscriptionManager] All subscriptions removed.');
  }
}