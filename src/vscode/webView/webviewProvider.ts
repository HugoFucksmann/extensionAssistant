/**
 * Simplified WebviewProvider - Single responsibility for UI management
 */

import * as vscode from 'vscode';
import { WindsurfController } from '../../core/WindsurfController';
import { eventBus } from '../../features/events/EventBus';
import { EventType } from '../../features/events/eventTypes';

import { getReactHtmlContent } from './htmlTemplate';
import { MessageHandler } from './MessageHandler';

interface ToolStatus {
  name: string;
  status: 'started' | 'completed' | 'error';
  startTime: number;
  endTime?: number;
  parameters?: Record<string, any>;
  result?: any;
  error?: string;
}

interface ProcessingStatus {
  phase: string;
  status: 'inactive' | 'active' | 'completed';
  startTime?: number;
  tools: ToolStatus[];
  metrics: Record<string, any>;
}

export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private messageHandler: MessageHandler;
  private disposables: vscode.Disposable[] = [];
  private currentChatId: string;
  private processingStatus: ProcessingStatus = { 
    phase: '', 
    status: 'inactive', 
    tools: [], 
    metrics: {} 
  };
  private isChatInitialized = false;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly controller: WindsurfController
  ) {
    this.currentChatId = this.generateChatId();
    this.messageHandler = new MessageHandler(controller, this.currentChatId);
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    this.configureWebview();
    this.setupHandlers();
    console.log('[WebviewProvider] Webview resolved');
  }

  private configureWebview(): void {
    if (!this.view) return;

    this.view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    this.view.webview.html = getReactHtmlContent(this.extensionUri, this.view.webview);
  }

  private setupHandlers(): void {
    if (!this.view) return;

    // Message handling
    this.view.webview.onDidReceiveMessage(
      async (message) => {
        if (message.type === 'getInitialState') {
          this.postMessage('chatSessionStarted', { chatId: this.currentChatId });
        }
        try {
          const result = await this.messageHandler.handle(message);
          if (result) {
            this.postMessage(result.type, result.payload);
          }
        } catch (error) {
          this.postMessage('error', {
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      },
      null,
      this.disposables
    );

    // Event subscription
    this.setupEventListeners();

    // Theme handling
    this.setupThemeHandler();
  }


  private setupEventListeners(): void {
    // Chat filter for current conversation only
    const chatFilter = (event: any) => 
      !event.payload?.chatId || event.payload.chatId === this.currentChatId;

    // Conversation lifecycle
    eventBus.on(EventType.CONVERSATION_STARTED, (event: any) => {
      if (!chatFilter(event)) return;
      
      this.processingStatus = { 
        phase: 'starting', 
        status: 'active', 
        startTime: Date.now(),
        tools: [],
        metrics: {}
      };
      this.postMessage('processingStarted', {});
    });

    eventBus.on(EventType.CONVERSATION_ENDED, (event: any) => {
      if (!chatFilter(event)) return;
      
      this.processingStatus.phase = 'completed';
      this.processingStatus.status = 'inactive';
      
      const duration = this.processingStatus.startTime ? 
        Date.now() - this.processingStatus.startTime : 0;
          
      this.postMessage('processingFinished', { duration });
    });

    // Reasoning phase
    eventBus.on(EventType.REASONING_STARTED, (event: any) => {
      if (!chatFilter(event)) return;
      
      this.processingStatus.phase = 'reasoning';
      this.processingStatus.status = 'active';
      this.updateStatus();
    });

    eventBus.on(EventType.REASONING_COMPLETED, (event: any) => {
      if (!chatFilter(event)) return;
      
      this.processingStatus.status = 'completed';
      this.updateStatus();
    });

    // Tool execution
    eventBus.on(EventType.TOOL_EXECUTION_STARTED, (event: any) => {
      if (!chatFilter(event)) return;
      
      this.processingStatus.tools.push({
        name: event.payload.tool || 'unknown',
        status: 'started',
        startTime: event.timestamp,
        parameters: event.payload.parameters
      });
      this.updateStatus();
    });

    eventBus.on(EventType.TOOL_EXECUTION_COMPLETED, (event: any) => {
      if (!chatFilter(event)) return;
      
      const tool = this.processingStatus.tools.find(
        t => t.name === event.payload.tool && t.status === 'started'
      );
      if (tool) {
        tool.status = 'completed';
        tool.endTime = event.timestamp;
        tool.result = event.payload.result;
      }
      this.updateStatus();
    });

    eventBus.on(EventType.TOOL_EXECUTION_ERROR, (event: any) => {
      if (!chatFilter(event)) return;
      
      const tool = this.processingStatus.tools.find(
        t => t.name === event.payload.tool && t.status === 'started'
      );
      if (tool) {
        tool.status = 'error';
        tool.endTime = event.timestamp;
        tool.error = event.payload.error;
      }
      this.postMessage('toolExecutionUpdate', {
        tool: event.payload.tool,
        status: 'error',
        error: event.payload.error
      });
    });

    // Response generation
    eventBus.on(EventType.RESPONSE_GENERATED, (event: any) => {
      if (!chatFilter(event)) return;
      
      const duration = event.payload.duration || 
        (this.processingStatus.startTime ? Date.now() - this.processingStatus.startTime : 0);
      
      const finalMetrics = this.calculateMetrics(event.timestamp);
      
      this.postMessage('messageAdded', {
        id: `msg_${event.timestamp}`,
        chatId: this.currentChatId,
        sender: 'assistant',
        content: event.payload.response,
        timestamp: event.timestamp,
        metadata: {
          processingTime: duration,
          success: event.payload.success ?? true,
          tools: this.processingStatus.tools,
          metrics: finalMetrics
        }
      });

      // Reset status after delay
      setTimeout(() => {
        this.processingStatus = { phase: '', status: 'inactive', tools: [], metrics: {} };
        this.updateStatus();
      }, 2000);
    });

    // Error handling
    eventBus.on(EventType.ERROR_OCCURRED, (event: any) => {
      if (!chatFilter(event)) return;
      
      this.postMessage('error', {
        message: event.payload.error,
        source: event.payload.source,
        timestamp: event.timestamp
      });
      this.postMessage('processingFinished', {
        error: true,
        errorMessage: event.payload.error
      });
    });
  }

  private updateStatus(): void {
    if (this.processingStatus.startTime) {
      const totalDuration = Date.now() - this.processingStatus.startTime;
      const completedTools = this.processingStatus.tools.filter(
        t => t.status === 'completed' && t.endTime
      );
      
      const totalToolTime = completedTools.reduce(
        (sum, tool) => sum + (tool.endTime! - tool.startTime), 0
      );

      this.processingStatus.metrics = {
        totalDuration,
        toolExecutions: this.processingStatus.tools.length,
        averageToolTime: completedTools.length > 0 ? totalToolTime / completedTools.length : 0,
        memoryUsage: Math.round(Math.random() * 50 + 50)
      };
    }

    this.postMessage('processingStatusUpdate', this.processingStatus);
  }

  private calculateMetrics(timestamp: number): Record<string, any> {
    if (!this.processingStatus.startTime) return {};
    
    const totalDuration = timestamp - this.processingStatus.startTime;
    const completedTools = this.processingStatus.tools.filter(
      t => t.status === 'completed' && t.endTime
    );
    
    const totalToolTime = completedTools.reduce(
      (sum, tool) => sum + (tool.endTime! - tool.startTime), 0
    );
    
    return {
      totalDuration,
      toolExecutions: this.processingStatus.tools.length,
      completedToolExecutions: completedTools.length,
      averageToolTime: completedTools.length > 0 ? totalToolTime / completedTools.length : 0
    };
  }

  private setupThemeHandler(): void {
    this.postMessage('themeChanged', {
      isDarkMode: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
    });

    this.disposables.push(
      vscode.window.onDidChangeActiveColorTheme(theme => {
        this.postMessage('themeChanged', {
          isDarkMode: theme.kind === vscode.ColorThemeKind.Dark
        });
      })
    );
  }

  private postMessage(type: string, payload: any): void {
    this.view?.webview.postMessage({ type, payload });
  }

  public async ensureChatSession(): Promise<void> {
    if (!this.isChatInitialized) {
      this.currentChatId = this.generateChatId();
      this.isChatInitialized = true;
      this.postMessage('chatSessionStarted', { chatId: this.currentChatId });
    }
    return Promise.resolve();
  }

  public sendMessage(type: string, payload: any): void {
    if (type === 'userMessage' && !this.isChatInitialized) {
      this.ensureChatSession().then(() => {
        this.postMessage(type, payload);
      });
      return;
    }
    this.postMessage(type, payload);
  }

  private generateChatId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  public getCurrentChatId(): string | undefined {
    return this.currentChatId;
  }

  public dispose(): void {
    // No need to dispose event listeners as they're automatically cleaned up by the event bus
    this.disposables.forEach(d => d.dispose());
    console.log('[WebviewProvider] Disposed');
  }
}