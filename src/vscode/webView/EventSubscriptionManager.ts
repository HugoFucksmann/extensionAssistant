import { eventBus } from '../../features/events/EventBus';
import { EventType, WindsurfEvent, ConversationEndedPayload } from '../../features/events/eventTypes';
import { SessionManager } from './SessionManager';

interface ProcessingStatus {
  phase: string;
  status: 'inactive' | 'active' | 'completed' | 'error';
  startTime?: number;
  tools: ToolStatus[];
  metrics: Record<string, any>;
}

interface ToolStatus {
  name: string;
  status: 'started' | 'completed' | 'error';
  startTime: number;
  endTime?: number;
  parameters?: Record<string, any>;
  result?: any;
  error?: string;
}

export class EventSubscriptionManager {
  private processingStatus: ProcessingStatus = {
    phase: '',
    status: 'inactive',
    tools: [],
    metrics: {},
  };

  constructor(
    private sessionManager: SessionManager,
    private postMessageToUI: (type: string, payload: any) => void
  ) {}

  public setupEventListeners(): void {
    this.subscribeToConversationEvents();
    this.subscribeToResponseEvents();
    this.subscribeToErrorEvents();
    this.subscribeToToolEvents();
  }

  private subscribeToConversationEvents(): void {
    eventBus.on(EventType.CONVERSATION_STARTED, (event: WindsurfEvent) => {
      if (!this.isEventForCurrentChat(event)) return;
      
      this.processingStatus = {
        phase: 'conversation_started',
        status: 'active',
        startTime: Date.now(),
        tools: [],
        metrics: {}
      };
      this.postMessageToUI('processingUpdate', this.processingStatus);
    });

    eventBus.on(EventType.CONVERSATION_ENDED, (event: WindsurfEvent) => {
      if (!this.isEventForCurrentChat(event)) return;
      
      const payload = event.payload as ConversationEndedPayload;
      this.processingStatus.phase = 'conversation_ended';
      this.processingStatus.status = payload.cleared ? 'inactive' : 'completed';
      
      if (this.processingStatus.startTime) {
        this.processingStatus.metrics.totalDuration = Date.now() - this.processingStatus.startTime;
      }
      
      this.postMessageToUI('processingUpdate', this.processingStatus);
    });
  }

  private subscribeToResponseEvents(): void {
    eventBus.on(EventType.RESPONSE_GENERATED, (event: WindsurfEvent) => {
      if (!this.isEventForCurrentChat(event)) return;
      
      console.log('[EventSubscriptionManager] RESPONSE_GENERATED for current chat');
      
      this.postMessageToUI('assistantResponse', {
        chatId: this.sessionManager.getCurrentChatId(),
        id: `asst_${event.id || Date.now()}`,
        content: (event.payload as any).response,
        sender: 'assistant',
        timestamp: event.timestamp,
        metadata: {
          processingTime: (event.payload as any).duration,
          tools: this.processingStatus.tools,
        },
      });

      // Mark processing as completed
      this.processingStatus.phase = 'response_delivered';
      this.processingStatus.status = 'completed';
      
      if (this.processingStatus.startTime) {
        this.processingStatus.metrics.totalDuration = Date.now() - this.processingStatus.startTime;
      }
      
      this.postMessageToUI('processingUpdate', this.processingStatus);
    });
  }

  private subscribeToErrorEvents(): void {
    eventBus.on(EventType.ERROR_OCCURRED, (event: WindsurfEvent) => {
      if (!this.isEventForCurrentChat(event) && (event.payload as any).chatId) return;
      
      console.error('[EventSubscriptionManager] ERROR_OCCURRED', event.payload);
      
      this.postMessageToUI('systemError', {
        message: (event.payload as any).error || 'An unknown error occurred.',
        source: (event.payload as any).source || 'UnknownSource',
        details: (event.payload as any).stack,
      });

      this.processingStatus.phase = 'error_occurred';
      this.processingStatus.status = 'error';
      this.postMessageToUI('processingUpdate', this.processingStatus);
    });
  }

  private subscribeToToolEvents(): void {
    eventBus.on(EventType.TOOL_EXECUTION_STARTED, (event: WindsurfEvent) => {
      if (!this.isEventForCurrentChat(event)) return;
      
      const toolName = (event.payload as any).tool || 'unknown_tool';
      this.processingStatus.tools.push({
        name: toolName,
        status: 'started',
        startTime: event.timestamp,
        parameters: (event.payload as any).parameters
      });
      
      this.processingStatus.phase = `tool_started:${toolName}`;
      this.postMessageToUI('processingUpdate', this.processingStatus);
    });

    eventBus.on(EventType.TOOL_EXECUTION_COMPLETED, (event: WindsurfEvent) => {
      if (!this.isEventForCurrentChat(event)) return;
      
      const toolName = (event.payload as any).tool || 'unknown_tool';
      const tool = this.processingStatus.tools.find(t => t.name === toolName && t.status === 'started');
      
      if (tool) {
        tool.status = 'completed';
        tool.endTime = event.timestamp;
        tool.result = (event.payload as any).result;
      }
      
      this.processingStatus.phase = `tool_completed:${toolName}`;
      this.postMessageToUI('processingUpdate', this.processingStatus);
    });

    eventBus.on(EventType.TOOL_EXECUTION_ERROR, (event: WindsurfEvent) => {
      if (!this.isEventForCurrentChat(event)) return;
      
      const toolName = (event.payload as any).tool || 'unknown_tool';
      const tool = this.processingStatus.tools.find(t => t.name === toolName && t.status === 'started');
      
      if (tool) {
        tool.status = 'error';
        tool.endTime = event.timestamp;
        tool.error = (event.payload as any).error;
      }
      
      this.processingStatus.phase = `tool_error:${toolName}`;
      this.postMessageToUI('processingUpdate', this.processingStatus);
    });
  }

  private isEventForCurrentChat(event: WindsurfEvent): boolean {
    const currentChatId = this.sessionManager.getCurrentChatId();
    
    // If event has no chatId, it's a global event and should be processed
    if (!event.payload || typeof (event.payload as any).chatId !== 'string') {
      return true;
    }
    
    return (event.payload as any).chatId === currentChatId;
  }

  public dispose(): void {
    // If EventBus supports unsubscribing, do it here
    // eventBus.off(EventType.RESPONSE_GENERATED, this.handleResponseGenerated);
    // etc...
  }
}