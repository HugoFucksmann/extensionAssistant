// src/vscode/webView/WebviewEventHandler.ts
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import {
  EventType,
  WindsurfEvent,
  ToolExecutionEventPayload,
  SystemEventPayload,
  ErrorOccurredEventPayload,
  ResponseEventPayload,
  AgentPhaseEventPayload, // Agregar esta importación
} from '../../features/events/eventTypes';
import { WebviewStateManager } from './WebviewStateManager';
import { ChatMessage, ToolOutput } from '../../shared/types';
import { IConversationManager } from '../../core/interfaces/IConversationManager';

export class WebviewEventHandler {
  /**
   * Actualiza el chatId activo para filtrar correctamente los eventos de respuesta.
   * Debe ser llamado desde WebviewMessageHandler cuando cambie el chat activo.
   */
  public setCurrentChatId(chatId: string) {
    this.currentChatId = chatId;
  }
  private dispatcherSubscriptions: { unsubscribe: () => void }[] = [];
  private currentChatId: string | null = null;

  constructor(
    private readonly internalEventDispatcher: InternalEventDispatcher,
    private readonly conversationManager: IConversationManager,
    private readonly stateManager: WebviewStateManager, 
    private readonly postMessage: (type: string, payload: any) => void
  ) {
    this.currentChatId = this.conversationManager.getActiveChatId();
  }

  public subscribeToEvents(): void {
    this.dispatcherSubscriptions.forEach(s => s.unsubscribe());
    this.dispatcherSubscriptions = [];

    const eventTypesToWatch: EventType[] = [
      EventType.TOOL_EXECUTION_STARTED,
      EventType.TOOL_EXECUTION_COMPLETED,
      EventType.TOOL_EXECUTION_ERROR,
      EventType.SYSTEM_ERROR,
      EventType.RESPONSE_GENERATED,
      EventType.AGENT_PHASE_STARTED,    // Agregar estos eventos
      EventType.AGENT_PHASE_COMPLETED, // para mostrar las fases
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
    let chatMessage: ChatMessage | null = null;
    let messageTypeForPost: string | null = null; 

    switch (event.type) {
      case EventType.TOOL_EXECUTION_STARTED:
        chatMessage = this.handleToolExecutionStarted(event.payload as ToolExecutionEventPayload, event.id);
        messageTypeForPost = 'agentActionUpdate';
        break;

      case EventType.TOOL_EXECUTION_COMPLETED:
        chatMessage = this.handleToolExecutionCompleted(event.payload as ToolExecutionEventPayload, event.id);
        messageTypeForPost = 'agentActionUpdate';
        break;

      case EventType.TOOL_EXECUTION_ERROR:
        chatMessage = this.handleToolExecutionError(event.payload as ToolExecutionEventPayload, event.id);
        messageTypeForPost = 'agentActionUpdate';
        break;

      case EventType.RESPONSE_GENERATED:
        const responsePayload = event.payload as ResponseEventPayload;
        if (responsePayload.isFinal && responsePayload.chatId === this.currentChatId) {
          chatMessage = this.handleResponseGenerated(responsePayload, event.id);
          messageTypeForPost = 'assistantResponse';
        }
        break;

      // Nuevos manejadores para fases del agente
      case EventType.AGENT_PHASE_STARTED:
        chatMessage = this.handleAgentPhaseStarted(event.payload as AgentPhaseEventPayload, event.id);
        messageTypeForPost = 'agentPhaseUpdate';
        break;

      case EventType.AGENT_PHASE_COMPLETED:
        chatMessage = this.handleAgentPhaseCompleted(event.payload as AgentPhaseEventPayload, event.id);
        messageTypeForPost = 'agentPhaseUpdate';
        break;

      case EventType.SYSTEM_ERROR:
        chatMessage = this.handleSystemError(event.payload as SystemEventPayload | ErrorOccurredEventPayload, event.id);
        messageTypeForPost = 'systemError';
        break;
    }

    if (chatMessage && messageTypeForPost) {
      this.postMessage(messageTypeForPost, chatMessage);
    }
  }

  private createBaseChatMessage(eventId: string, sender: ChatMessage['sender'], operationId?: string): Partial<ChatMessage> {
    return {
      id: operationId || eventId,
      operationId: operationId, 
      timestamp: Date.now(),
      sender: sender,
      metadata: {}
    };
  }

  // Nuevos manejadores para fases del agente
  private handleAgentPhaseStarted(payload: AgentPhaseEventPayload, eventId: string): ChatMessage {
    const chatMsg = this.createBaseChatMessage(eventId, 'system') as ChatMessage;
    
    const phaseNames: Record<string, string> = {
      'initialAnalysis': '🔍 Analizando la consulta',
      'reasoning': '🤔 Razonando sobre la acción',
      'finalResponseGeneration': '✍️ Generando respuesta final'
    };
    
    chatMsg.content = phaseNames[payload.phase] || `Iniciando fase: ${payload.phase}`;
    chatMsg.metadata = {
      ...chatMsg.metadata,
      status: 'phase_started',
      phase: payload.phase,
      iteration: payload.iteration,
      source: payload.source
    };
    
    return chatMsg;
  }

  private handleAgentPhaseCompleted(payload: AgentPhaseEventPayload, eventId: string): ChatMessage {
    const chatMsg = this.createBaseChatMessage(eventId, 'system') as ChatMessage;
    
    const phaseCompletedNames: Record<string, string> = {
      'initialAnalysis': '✅ Análisis completado',
      'reasoning': '✅ Razonamiento completado', 
      'finalResponseGeneration': '✅ Respuesta lista'
    };
    
    let content = phaseCompletedNames[payload.phase] || `Fase completada: ${payload.phase}`;
    
    // Agregar detalles específicos según la fase
    if (payload.data) {
      if (payload.phase === 'initialAnalysis' && payload.data.analysis?.understanding) {
        const understanding = payload.data.analysis.understanding.substring(0, 100);
        content += `\n💡 Entendimiento: ${understanding}${payload.data.analysis.understanding.length > 100 ? '...' : ''}`;
      } else if (payload.phase === 'reasoning' && payload.data.reasoning?.nextAction) {
        const action = payload.data.reasoning.nextAction === 'use_tool' ? 
          `usar herramienta: ${payload.data.reasoning.tool}` : 
          'responder al usuario';
        content += `\n🎯 Próxima acción: ${action}`;
      }
    }
    
    chatMsg.content = content;
    chatMsg.metadata = {
      ...chatMsg.metadata,
      status: 'phase_completed',
      phase: payload.phase,
      iteration: payload.iteration,
      source: payload.source,
      phaseData: payload.data
    };
    
    return chatMsg;
  }

  private handleToolExecutionStarted(payload: ToolExecutionEventPayload, eventId: string): ChatMessage {
    const chatMsg = this.createBaseChatMessage(eventId, 'system', payload.operationId) as ChatMessage;
    chatMsg.content = `🔧 ${payload.toolDescription || `Ejecutando ${payload.toolName || 'herramienta'}`}...`;
    chatMsg.metadata = {
      ...chatMsg.metadata,
      status: 'tool_executing',
      toolName: payload.toolName,
      toolInput: payload.toolParams || payload.parameters,
    };
    return chatMsg;
  }

  private handleToolExecutionCompleted(payload: ToolExecutionEventPayload, eventId: string): ChatMessage {
    const chatMsg = this.createBaseChatMessage(eventId, 'system', payload.operationId) as ChatMessage;

    let contentLines: string[] = [];
    const toolDisplayName = payload.toolDescription || payload.toolName || 'La herramienta';

    if (payload.toolSuccess === false && payload.error) {
      contentLines.push(`❌ ${toolDisplayName} encontró un error: ${payload.error}`);
    } else {
      contentLines.push(`✅ ${toolDisplayName} finalizó correctamente.`);
    }

    const toolResultOutput = payload.result as ToolOutput | undefined;
    if (toolResultOutput?.message) {
      const shortMessage = toolResultOutput.message.substring(0, 150);
      contentLines.push(`📋 Resultado: ${shortMessage}${toolResultOutput.message.length > 150 ? '...' : ''}`);
    }

    const modelAnalysis = payload.modelAnalysis as any;
    if (modelAnalysis?.interpretation) { 
      contentLines.push(`🧠 Análisis: ${modelAnalysis.interpretation.substring(0,100)}...`);
    }

    chatMsg.content = contentLines.join('\n') || `${toolDisplayName} procesada.`;
    chatMsg.metadata = {
      ...chatMsg.metadata,
      status: payload.toolSuccess !== false ? 'success' : 'error',
      toolName: payload.toolName,
      toolInput: payload.toolParams || payload.parameters,
      toolOutput: payload.result, 
      rawToolOutput: payload.rawToolOutput,
      modelAnalysis: payload.modelAnalysis,
      toolSuccess: payload.toolSuccess,
      toolError: payload.error,
    };
    return chatMsg;
  }

  private handleToolExecutionError(payload: ToolExecutionEventPayload, eventId: string): ChatMessage {
    const chatMsg = this.createBaseChatMessage(eventId, 'system', payload.operationId) as ChatMessage;
    chatMsg.content = `❌ Error ejecutando ${payload.toolDescription || payload.toolName || 'herramienta'}: ${payload.error || 'Error desconocido'}`;
    chatMsg.metadata = {
      ...chatMsg.metadata,
      status: 'error',
      toolName: payload.toolName,
      toolInput: payload.toolParams || payload.parameters,
      error: payload.error,
      toolOutput: payload.result, 
      modelAnalysis: payload.modelAnalysis,
      toolSuccess: false,
    };
    return chatMsg;
  }

  private handleSystemError(payload: SystemEventPayload | ErrorOccurredEventPayload, eventId: string): ChatMessage {
    const chatMsg = this.createBaseChatMessage(eventId, 'system') as ChatMessage;
    let errorMessageText = 'Error inesperado del sistema.';
    
    if ('message' in payload && typeof payload.message === 'string') {
      errorMessageText = payload.message;
    } else if ('errorMessage' in payload && typeof payload.errorMessage === 'string') {
      errorMessageText = payload.errorMessage;
    }

    chatMsg.content = `⚠️ Error del sistema: ${errorMessageText}`;
    chatMsg.metadata = {
      ...chatMsg.metadata,
      status: 'error',
      details: 'details' in payload ? payload.details : undefined,
      errorObject: 'errorObject' in payload ? payload.errorObject : undefined,
      source: payload.source,
      level: 'level' in payload ? payload.level : 'error',
    };
    return chatMsg;
  }

  private handleResponseGenerated(payload: ResponseEventPayload, eventId: string): ChatMessage {
    const chatMsg = this.createBaseChatMessage(eventId, 'assistant', payload.operationId) as ChatMessage;
    chatMsg.content = payload.responseContent;
    chatMsg.metadata = {
      ...chatMsg.metadata,
      status: 'success',
      isFinalToolResponse: payload.metadata?.isFinalToolResponse,
      processingTime: payload.duration,
      ...(payload.metadata || {}),
    };
    return chatMsg;
  }

  public dispose(): void {
    this.dispatcherSubscriptions.forEach(s => s.unsubscribe());
    this.dispatcherSubscriptions = [];
    console.log('[WebviewEventHandler] Disposed and subscriptions cleared.');
  }
}