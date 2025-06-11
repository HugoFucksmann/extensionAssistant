// Refactored WebviewProvider.ts
import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { getReactHtmlContent } from './htmlTemplate';
import { WebviewMessageHandler } from './WebviewMessageHandler';
import { WebviewBackendAdapter } from '../adapters/WebviewBackendAdapter';
import { WebviewEventAdapter } from '../adapters/WebviewEventAdapter';
import { MessageFormatter } from '../formatters/MessageFormatter';
import { ApplicationLogicService } from '@core/ApplicationLogicService';
import { InternalEventDispatcher } from '@core/events/InternalEventDispatcher';
import { IConversationManager } from '@core/interfaces/IConversationManager';

interface WebviewState {
    isConnected: boolean;
}

export class WebviewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private disposables: vscode.Disposable[] = [];
    private messageHandler: WebviewMessageHandler;
    private backendAdapter: WebviewBackendAdapter;
    private eventAdapter: WebviewEventAdapter;
    private state: WebviewState = { isConnected: false };

    constructor(
        private readonly extensionUri: vscode.Uri,
        appLogicService: ApplicationLogicService,
        eventDispatcher: InternalEventDispatcher,
        conversationManager: IConversationManager
    ) {
        this.backendAdapter = new WebviewBackendAdapter(appLogicService, conversationManager);
        this.eventAdapter = new WebviewEventAdapter(
            eventDispatcher,
            new MessageFormatter(),
            this.postMessage.bind(this)
        );
        this.messageHandler = new WebviewMessageHandler(
            this.backendAdapter,
            this.eventAdapter,
            this.postMessage.bind(this)
        );
    }

    public resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView;
        this.setupWebview();
        this.setupMessageHandling();
        this.eventAdapter.subscribeToEvents();
        this.state.isConnected = true;
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
            message => this.messageHandler.handleMessage(message),
            null,
            this.disposables
        );
    }

    // Public API methods
    public async startNewChat(): Promise<void> {
        const result = await this.backendAdapter.createNewChat();
        if (result.success) {
            this.eventAdapter.setChatId(result.data.chatId);
            this.postMessage('newChatStarted', result.data);
            this.postMessage('sessionReady', {
                chatId: result.data.chatId,
                messages: [],
            });
        } else {
            this.postMessage('systemError', { message: result.error?.message });
        }
    }

    // Methods that were missing from original WebviewProvider
    public async loadFiles(): Promise<void> {
        const result = await this.backendAdapter.executeCommand('getProjectFiles', {});
        if (result.success) {
            this.postMessage('projectFiles', result.data);
        }
    }

    public requestShowHistory(): void {
        this.postMessage('showHistory', {});
    }

    public getCurrentChatId(): string | null {
        return this.backendAdapter.getCurrentChatId();
    }

    public getState(): WebviewState {
        return { ...this.state };
    }

    // Utility methods
    private postMessage(type: string, payload: any): void {
        if (this.view) {
            this.view.webview.postMessage({ type, payload });
        } else {
            console.warn(`[WebviewProvider] View not available. Cannot post message: ${type}`);
        }
    }

    private getNonce(): string {
        return crypto.randomBytes(16).toString('hex');
    }

    public dispose(): void {
        this.state.isConnected = false;
        this.disposables.forEach(d => d.dispose());
        this.eventAdapter.dispose();
        console.log('[WebviewProvider] Disposed successfully');
    }
}