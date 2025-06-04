// src/vscode/webView/WebviewEventHandler.ts
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import {
  EventType,
  WindsurfEvent,
  ToolExecutionEventPayload,
  SystemEventPayload,
  ErrorOccurredEventPayload,
  ResponseEventPayload,
  AgentPhaseEventPayload,
} from '../../features/events/eventTypes';
import { WebviewStateManager } from './WebviewStateManager';
import { ChatMessage } from '../../features/chat/types';
import { mapToolResponse } from './utils/toolResponseMapper';
import { IConversationManager } from '../../core/interfaces/IConversationManager';
import { ToolResult } from '../../features/tools/types';

export class WebviewEventHandler {

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
      EventType.AGENT_PHASE_STARTED,
      EventType.AGENT_PHASE_COMPLETED,
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


    if (event.type !== EventType.SYSTEM_ERROR && event.payload.chatId && event.payload.chatId !== this.currentChatId) {

      return;
    }


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

        chatMessage = this.handleResponseGenerated(responsePayload, event.id);
        messageTypeForPost = 'assistantResponse';
        break;


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
      toolInput: payload.parameters, // Usar 'parameters'
    };
    return chatMsg;
  }


  private handleToolExecutionCompleted(payload: ToolExecutionEventPayload, eventId: string): ChatMessage {
    const chatMsg = this.createBaseChatMessage(eventId, 'system', payload.operationId) as ChatMessage;


    const toolResultFromEvent: ToolResult<any> = {
      success: payload.toolSuccess === true,
      data: payload.rawToolOutput,
      error: payload.toolSuccess === false ? payload.error : undefined,
      executionTime: payload.duration,
      warnings: (payload.rawToolOutput as any)?.warnings || (payload.result as any)?.meta?.warnings
    };

    const mappedOutput = mapToolResponse(
      payload.toolName || 'UnknownTool',
      toolResultFromEvent
    );

    let contentLines: string[] = [];
    const toolDisplayName = payload.toolDescription || payload.toolName || 'La herramienta';


    if (!toolResultFromEvent.success) {
      contentLines.push(`❌ ${toolDisplayName} encontró un error: ${toolResultFromEvent.error || mappedOutput.summary}`);
    } else {
      contentLines.push(`✅ ${toolDisplayName} finalizó correctamente.`);
    }

    if (mappedOutput.summary) {
      const shortMessage = mappedOutput.summary.substring(0, 150);
      contentLines.push(`📋 Resultado: ${shortMessage}${mappedOutput.summary.length > 150 ? '...' : ''}`);
    } else if (mappedOutput.details) {
      const shortMessage = mappedOutput.details.substring(0, 150);
      contentLines.push(`📋 Resultado: ${shortMessage}${mappedOutput.details.length > 150 ? '...' : ''}`);
    }

    const modelAnalysis = payload.modelAnalysis as any;
    if (modelAnalysis?.interpretation) {
      contentLines.push(`🧠 Análisis: ${modelAnalysis.interpretation.substring(0, 100)}...`);
    }

    chatMsg.content = contentLines.join('\n') || `${toolDisplayName} procesada.`;
    chatMsg.metadata = {
      ...chatMsg.metadata,
      status: toolResultFromEvent.success ? 'success' : 'error',
      toolName: payload.toolName,
      toolInput: payload.parameters,
      toolOutput: mappedOutput,
      rawToolOutput: payload.rawToolOutput,
      modelAnalysis: payload.modelAnalysis,
      toolSuccess: toolResultFromEvent.success,
      toolError: toolResultFromEvent.error,
      warnings: toolResultFromEvent.warnings,
    };
    return chatMsg;
  }

  private handleToolExecutionError(payload: ToolExecutionEventPayload, eventId: string): ChatMessage {
    const chatMsg = this.createBaseChatMessage(eventId, 'system', payload.operationId) as ChatMessage;


    const toolResultFromEvent: ToolResult<any> = {
      success: false,
      data: payload.rawToolOutput,
      error: payload.error || 'Error desconocido al ejecutar la herramienta.',
      executionTime: payload.duration,
      warnings: (payload.rawToolOutput as any)?.warnings || (payload.result as any)?.meta?.warnings
    };

    const mappedOutput = mapToolResponse(
      payload.toolName || 'UnknownTool',
      toolResultFromEvent
    );

    chatMsg.content = mappedOutput.title;
    if (mappedOutput.summary && mappedOutput.summary !== mappedOutput.title) {
      chatMsg.content += `\n${mappedOutput.summary}`;
    }

    chatMsg.metadata = {
      ...chatMsg.metadata,
      status: 'error',
      toolName: payload.toolName,
      toolInput: payload.parameters,
      error: toolResultFromEvent.error,
      toolOutput: mappedOutput,
      rawToolOutput: payload.rawToolOutput,
      modelAnalysis: payload.modelAnalysis,
      toolSuccess: false,
      warnings: toolResultFromEvent.warnings,
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