// src/vscode/webview/WebviewProvider.ts - Updated provider
import * as vscode from 'vscode';
import { getReactHtmlContent } from './htmlTemplate';
import { ApplicationLogicService } from '../../core/ApplicationLogicService';

export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];
  private currentChatId: string | null = null;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly appLogicService: ApplicationLogicService
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    this.setupWebview();
    this.setupMessageHandling();
  }

  private setupWebview(): void {
    if (!this.view) return;

    this.view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    this.view.webview.html = getReactHtmlContent({
      scriptUri: this.view.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'out', 'webView', 'webview.js')),
      nonce: this.getNonce()
    });
  }

  private setupMessageHandling(): void {
    if (!this.view) return;

    this.view.webview.onDidReceiveMessage(
      async (message) => {
        console.log('[WebviewProvider] Received:', message.type);

        switch (message.type) {
          case 'uiReady':
            this.currentChatId = this.generateChatId();
            this.postMessage('sessionReady', {
              chatId: this.currentChatId,
              messages: []
            });
            break;

          case 'userMessageSent':
            if (!this.currentChatId) {
              this.postMessage('systemError', { message: 'No active chat session' });
              return;
            }
            await this.handleUserMessage(message.payload);
            break;

          case 'newChatRequestedByUI':
            this.currentChatId = this.generateChatId();
            this.postMessage('newChatStarted', { chatId: this.currentChatId });
            break;

          case 'showHistoryRequested':
            this.postMessage('showHistory', {});
            break;
        }
      },
      null,
      this.disposables
    );
  }

  private async handleUserMessage(payload: { text: string; files?: string[] }): Promise<void> {
    if (!payload.text?.trim()) {
      this.postMessage('systemError', { message: 'Message cannot be empty' });
      return;
    }

    try {
      this.postMessage('processingUpdate', { phase: 'processing' });
      
      const result = await this.appLogicService.processUserMessage(
        this.currentChatId!,
        payload.text,
        { files: payload.files || [] }
      );

      if (result.success && result.finalResponse) {
        this.postMessage('assistantResponse', {
          id: `asst_${Date.now()}`,
          content: result.finalResponse,
          timestamp: Date.now(),
        });
      } else {
        this.postMessage('systemError', { 
          message: result.error || 'Processing failed' 
        });
      }
    } catch (error) {
      console.error('[WebviewProvider] Error processing message:', error);
      this.postMessage('systemError', { 
        message: 'An unexpected error occurred' 
      });
    }
  }

  // Public methods for extension commands
  public requestShowHistory(): void {
    this.postMessage('showHistory', {});
  }

  public startNewChat(): void {
    this.currentChatId = this.generateChatId();
    this.postMessage('newChatStarted', { chatId: this.currentChatId });
  }

  private postMessage(type: string, payload: any): void {
    this.view?.webview.postMessage({ type, payload });
  }

  private generateChatId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}