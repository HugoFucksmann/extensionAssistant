// src/vscode/webView/WebviewProvider.ts - Main provider (simplified)
import * as vscode from 'vscode';
import { WindsurfController } from '../../core/WindsurfController';
import { getReactHtmlContent } from './htmlTemplate';
import { MessageForwarder } from './MessageForwarder';
import { EventSubscriptionManager } from './EventSubscriptionManager';
import { SessionManager } from './SessionManager';
import { UIMessageHandler } from './UIMessageHandler';
import { ThemeManager } from './ThemeManager';


export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];
  
  // Modular components
  private messageForwarder: MessageForwarder;
  private eventManager: EventSubscriptionManager;
  private sessionManager: SessionManager;
  private uiMessageHandler: UIMessageHandler;
  private themeManager: ThemeManager;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly controller: WindsurfController
  ) {
    this.messageForwarder = new MessageForwarder(controller);
    this.sessionManager = new SessionManager();
    this.eventManager = new EventSubscriptionManager(
      this.sessionManager,
      this.postMessageToUI.bind(this)
    );
    this.uiMessageHandler = new UIMessageHandler(
      this.sessionManager,
      this.messageForwarder,
      this.postMessageToUI.bind(this)
    );
    this.themeManager = new ThemeManager(this.postMessageToUI.bind(this));
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void {
    this.view = webviewView;
    this.setupWebview();
    this.setupMessageHandling();
    this.eventManager.setupEventListeners();
    this.themeManager.setup(this.disposables);
  }

  private setupWebview(): void {
    if (!this.view) return;
    
    this.view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    this.view.webview.html = getReactHtmlContent(this.extensionUri, this.view.webview);
  }

  private setupMessageHandling(): void {
    if (!this.view) return;
    
    this.view.webview.onDidReceiveMessage(
      (message) => this.uiMessageHandler.handle(message),
      null,
      this.disposables
    );
  }

  private postMessageToUI(type: string, payload: any): void {
    if (this.view?.webview) {
      console.log('[WebviewProvider] Posting to UI:', { type, payload });
      this.view.webview.postMessage({ type, payload });
    } else {
      console.warn(`[WebviewProvider] Cannot post message. View unavailable. Type: ${type}`);
    }
  }

  // Public methods for external control
  public startNewChat(): void {
    this.sessionManager.startNewChat();
    this.postMessageToUI('newChatStarted', { 
      chatId: this.sessionManager.getCurrentChatId() 
    });
  }

  public requestShowHistory(): void {
    // TODO: Get real history from controller
    const simulatedHistory = [
      { id: 'chat1', title: 'Old Chat 1', timestamp: Date.now() - 100000 },
      { id: 'chat2', title: 'Another Chat', timestamp: Date.now() - 200000 },
    ];
    this.postMessageToUI('showHistoryView', { chats: simulatedHistory });
  }

  public dispose(): void {
    console.log('[WebviewProvider] Disposing...');
    this.disposables.forEach((d) => d.dispose());
    this.eventManager.dispose();
  }
}