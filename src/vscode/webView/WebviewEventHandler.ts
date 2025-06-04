// src/vscode/webView/WebviewEventHandler.ts
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import {
  EventType,
  WindsurfEvent,
  ToolExecutionEventPayload,
  SystemEventPayload,
  ResponseEventPayload,
  AgentPhaseEventPayload,
} from '../../features/events/eventTypes';
import { WebviewStateManager } from './WebviewStateManager';
import { ChatMessage } from '../../features/chat/types';
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
        chatMessage = this.handleSystemError(event.payload as SystemEventPayload, event.id);
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

  private formatToolOutput(toolName: string, output: any, isError: boolean = false): { title: string; summary: string; details: string } {
    const toolDisplayName = toolName || 'herramienta';
    
    if (isError) {
      const errorMessage = output?.message || output?.error || 'Error desconocido';
      return {
        title: `❌ Error en ${toolDisplayName}`,
        summary: errorMessage,
        details: typeof output === 'string' ? output : JSON.stringify(output, null, 2)
      };
    }

    if (output === null || output === undefined) {
      return {
        title: `✅ ${toolDisplayName} completado`,
        summary: 'La operación se completó correctamente',
        details: ''
      };
    }

    if (typeof output === 'string') {
      return {
        title: `✅ ${toolDisplayName} completado`,
        summary: output.length > 150 ? output.substring(0, 150) + '...' : output,
        details: output
      };
    }

    if (Array.isArray(output)) {
      return {
        title: `✅ ${toolDisplayName} completado`,
        summary: `Se devolvieron ${output.length} elementos`,
        details: JSON.stringify(output, null, 2)
      };
    }

    if (typeof output === 'object') {
      if (output.message) {
        return {
          title: `✅ ${toolDisplayName} completado`,
          summary: output.message,
          details: JSON.stringify(output, null, 2)
        };
      }
      return {
        title: `✅ ${toolDisplayName} completado`,
        summary: 'Operación completada con éxito',
        details: JSON.stringify(output, null, 2)
      };
    }

    return {
      title: `✅ ${toolDisplayName} completado`,
      summary: 'La operación se completó correctamente',
      details: String(output)
    };
  }

  private handleToolExecutionStarted(payload: ToolExecutionEventPayload, eventId: string): ChatMessage {
    const chatMsg = this.createBaseChatMessage(eventId, 'system', payload.operationId) as ChatMessage;
    chatMsg.content = `🔧 ${payload.toolDescription || `Ejecutando ${payload.toolName || 'herramienta'}`}...`;
    chatMsg.metadata = {
      ...chatMsg.metadata,
      status: 'tool_executing',
      toolName: payload.toolName,
      toolInput: payload.parameters,
      operationId: payload.operationId
    };
    return chatMsg;
  }





  private handleToolExecutionCompleted(payload: ToolExecutionEventPayload, eventId: string): ChatMessage {
    const chatMsg = this.createBaseChatMessage(eventId, 'system', payload.operationId) as ChatMessage;
    const toolDisplayName = payload.toolDescription || payload.toolName || 'La herramienta';
    
    // Formatear la salida
    const formattedOutput = this.formatToolOutput(
      payload.toolName || 'UnknownTool',
      payload.rawOutput
    );

    // Construir el contenido del mensaje
    const contentLines: string[] = [
      `✅ ${toolDisplayName} finalizó correctamente.`,
      `📋 ${formattedOutput.summary}`
    ];

    // Agregar análisis del modelo si está disponible
    if (payload.modelAnalysis?.interpretation) {
      const interpretation = payload.modelAnalysis.interpretation;
      contentLines.push(`🧠 Análisis: ${interpretation.substring(0, 100)}${interpretation.length > 100 ? '...' : ''}`);
    }

    // Establecer el contenido y metadatos del mensaje
    chatMsg.content = contentLines.join('\n');
    chatMsg.metadata = {
      ...chatMsg.metadata,
      status: 'success',
      toolName: payload.toolName,
      toolInput: payload.parameters,
      toolOutput: {
        title: formattedOutput.title,
        summary: formattedOutput.summary,
        details: formattedOutput.details,
        items: Array.isArray(payload.rawOutput) ? payload.rawOutput : [payload.rawOutput],
        meta: {
          executionTime: payload.duration,
          success: true
        }
      },
      rawOutput: payload.rawOutput,
      modelAnalysis: payload.modelAnalysis,
      toolSuccess: true,
      warnings: (payload.rawOutput as any)?.warnings
    };

    return chatMsg;
  }

  private handleToolExecutionError(payload: ToolExecutionEventPayload, eventId: string): ChatMessage {
    const chatMsg = this.createBaseChatMessage(eventId, 'system', payload.operationId) as ChatMessage;
    const toolDisplayName = payload.toolDescription || payload.toolName || 'La herramienta';
    
    // Formatear el error
    const errorMessage = payload.error || 'Error desconocido al ejecutar la herramienta.';
    const formattedOutput = this.formatToolOutput(
      payload.toolName || 'UnknownTool',
      { error: errorMessage },
      true
    );

    // Construir el contenido del mensaje
    chatMsg.content = [
      `❌ ${toolDisplayName} encontró un error`,
      `📋 ${formattedOutput.summary}`
    ].join('\n');

    // Establecer metadatos del mensaje
    chatMsg.metadata = {
      ...chatMsg.metadata,
      status: 'error',
      toolName: payload.toolName,
      toolInput: payload.parameters,
      error: errorMessage,
      toolOutput: {
        title: formattedOutput.title,
        summary: formattedOutput.summary,
        details: formattedOutput.details,
        items: [],
        meta: {
          executionTime: payload.duration,
          success: false,
          error: errorMessage
        }
      },
      rawOutput: payload.rawOutput,
      modelAnalysis: payload.modelAnalysis,
      toolSuccess: false,
      warnings: (payload.rawOutput as any)?.warnings
    };

    return chatMsg;
  }

  private handleSystemError(payload: SystemEventPayload, eventId: string): ChatMessage {
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