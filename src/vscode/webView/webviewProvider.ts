import * as vscode from 'vscode';
import { getReactHtmlContent } from './htmlTemplate';
import { ApplicationLogicService } from '../../core/ApplicationLogicService';
import { InternalEventDispatcher } from '../../core/events/InternalEventDispatcher';
import { WebviewMessageHandler } from './WebviewMessageHandler';
import { WebviewEventHandler } from './WebviewEventHandler';
import { WebviewStateManager } from './WebviewStateManager';
import * as crypto from 'crypto';

export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];
  private stateManager: WebviewStateManager;
  private messageHandler: WebviewMessageHandler;
  private eventHandler: WebviewEventHandler;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly appLogicService: ApplicationLogicService,
    private readonly internalEventDispatcher: InternalEventDispatcher
  ) {
    this.stateManager = new WebviewStateManager();
    this.messageHandler = new WebviewMessageHandler(
      this.appLogicService,
      this.stateManager,
      this.postMessage.bind(this)
    );
    this.eventHandler = new WebviewEventHandler(
      this.internalEventDispatcher,
      this.stateManager,
      this.postMessage.bind(this)
    );
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    this.setupWebview();
    this.setupMessageHandling();
    this.eventHandler.subscribeToEvents();
  }

  private setupWebview(): void {
    if (!this.view) return;

    this.view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    
    this.view.webview.html = getReactHtmlContent({
      scriptUri: this.view.webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'out', 'webView', 'webview.js')
      ),
      nonce: this.getNonce()
    });
  }

  private setupMessageHandling(): void {
    if (!this.view) return;

    this.view.webview.onDidReceiveMessage(
      this.messageHandler.handleMessage.bind(this.messageHandler),
      null,
      this.disposables
    );
  }

  public requestShowHistory(): void {
   
    this.postMessage('showHistory', {});
  }

  public startNewChat(): void {
    const oldChatId = this.stateManager.getCurrentChatId();
    this.stateManager.startNewChat();
    
    
    this.postMessage('newChatStarted', { chatId: this.stateManager.getCurrentChatId() });
  }



  private postMessage(type: string, payload: any): void {
    if (this.view) {
      this.view.webview.postMessage({ type, payload });
    } else {
      console.warn(`[WebviewProvider DEBUG] View not available. Cannot post message: Type: ${type}`);
    }
  }

  private getNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  public dispose(): void {
    
    this.disposables.forEach(d => d.dispose());
    this.eventHandler.dispose();
  }
}