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
import { mapToolResponse, ToolOutput } from './utils/toolResponseMapper';
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
      toolInput: payload.toolParams || payload.parameters,
    };
    return chatMsg;
  }

  private handleToolExecutionCompleted(payload: ToolExecutionEventPayload, eventId: string): ChatMessage {
    const chatMsg = this.createBaseChatMessage(eventId, 'system', payload.operationId) as ChatMessage;

    // Assuming payload.result IS the ToolResult object from the tool execution
    // If payload.result is not the full ToolResult, this needs adjustment.
    // For now, we construct it if it's not in the expected shape or if payload.toolSuccess is present.
    let toolResult: ToolResult<any>;
    if (payload.result && typeof payload.result === 'object' && 'success' in payload.result) {
      toolResult = payload.result as ToolResult<any>;
    } else {
      // Fallback: construct ToolResult from individual payload fields
      toolResult = {
        success: payload.toolSuccess !== false, // Default to true if toolSuccess is undefined
        data: payload.toolSuccess !== false ? payload.result : undefined,
        error: payload.toolSuccess === false ? payload.error : undefined,
        // executionTime is not directly available here, mapToolResponse will handle it if present in result.data
      };
    }

    const mappedOutput = mapToolResponse(
      payload.toolName || 'UnknownTool',
      toolResult
    );

    let contentLines: string[] = [];
    const toolDisplayName = payload.toolDescription || payload.toolName || 'La herramienta';

    if (!toolResult.success) {
      contentLines.push(`❌ ${toolDisplayName} encontró un error: ${toolResult.error || mappedOutput.summary}`);
    } else {
      contentLines.push(`✅ ${toolDisplayName} finalizó correctamente.`);
    }

    if (mappedOutput.summary) {
      const shortMessage = mappedOutput.summary.substring(0, 150);
      contentLines.push(`📋 Resultado: ${shortMessage}${mappedOutput.summary.length > 150 ? '...' : ''}`);
    } else if (mappedOutput.details) { // Fallback if summary is not insightful
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
      status: toolResult.success ? 'success' : 'error',
      toolName: payload.toolName,
      toolInput: payload.toolParams || payload.parameters,
      toolOutput: mappedOutput, // Store the mapped output
      rawToolOutput: toolResult.data, // Store the data part of the ToolResult
      modelAnalysis: payload.modelAnalysis,
      toolSuccess: toolResult.success, // From ToolResult
      toolError: toolResult.error,     // From ToolResult
      warnings: toolResult.warnings,   // From ToolResult
    };
    return chatMsg;
  }

  private handleToolExecutionError(payload: ToolExecutionEventPayload, eventId: string): ChatMessage {
    const chatMsg = this.createBaseChatMessage(eventId, 'system', payload.operationId) as ChatMessage;

    let toolResult: ToolResult<any>;
    // Prefer payload.result if it's a ToolResult object, otherwise construct from payload.error
    if (payload.result && typeof payload.result === 'object' && 'success' in payload.result && (payload.result as ToolResult<any>).success === false) {
      toolResult = payload.result as ToolResult<any>;
    } else {
      toolResult = {
        success: false,
        error: payload.error || 'Error desconocido al ejecutar la herramienta.',
        data: payload.result, // This might contain some context or be undefined
      };
    }

    const mappedOutput = mapToolResponse(
      payload.toolName || 'UnknownTool',
      toolResult
    );

    chatMsg.content = mappedOutput.title; // Use title from mappedOutput
    if (mappedOutput.summary && mappedOutput.summary !== mappedOutput.title) {
      chatMsg.content += `\n${mappedOutput.summary}`;
    }

    chatMsg.metadata = {
      ...chatMsg.metadata,
      status: 'error',
      toolName: payload.toolName,
      toolInput: payload.toolParams || payload.parameters,
      error: toolResult.error, // From (constructed or actual) ToolResult
      toolOutput: mappedOutput, // Store the mapped output
      rawToolOutput: toolResult.data, // Store the data part of the ToolResult
      modelAnalysis: payload.modelAnalysis,
      toolSuccess: false, // Explicitly false
      warnings: toolResult.warnings,
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