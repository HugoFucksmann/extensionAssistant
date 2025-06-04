// src/vscode/webView/WebviewProvider.ts - Refactored Version

import * as vscode from 'vscode';
import { getReactHtmlContent } from './htmlTemplate';
import { ApplicationLogicService } from '../../../core/ApplicationLogicService';
import { InternalEventDispatcher } from '../../../core/events/InternalEventDispatcher';
import { IConversationManager } from '../../../core/interfaces/IConversationManager';
import * as crypto from 'crypto';

// New architecture imports
import { WebviewStateManager } from './WebviewStateManager';
import { WebviewBackendAdapter } from './WebviewBackendAdapter';
import { MessageRouter, MessageContext } from '../handlers/MessageRouter';
import { CommandProcessor } from '../handlers/CommandProcessor';
import { ErrorManager } from '../handlers/ErrorManager';
import { EventSubscriber } from '../handlers/EventSubscriber';
import { MessageFormatter } from '../formatters/MessageFormatter';

export class WebviewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private disposables: vscode.Disposable[] = [];

    // Core components
    private stateManager!: WebviewStateManager;
    private backendAdapter!: WebviewBackendAdapter;
    private messageFormatter!: MessageFormatter;

    // Handlers
    private messageRouter!: MessageRouter;
    private commandProcessor!: CommandProcessor;
    private errorManager!: ErrorManager;
    private eventSubscriber!: EventSubscriber;

    // Context
    private messageContext!: MessageContext;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly appLogicService: ApplicationLogicService,
        private readonly internalEventDispatcher: InternalEventDispatcher,
        private readonly conversationManager: IConversationManager
    ) {
        this.initializeComponents();
    }

    private initializeComponents(): void {
        // Initialize core components
        this.stateManager = new WebviewStateManager();
        this.backendAdapter = new WebviewBackendAdapter(this.appLogicService, this.conversationManager);
        this.messageFormatter = new MessageFormatter();

        // Initialize handlers
        this.errorManager = new ErrorManager(this.internalEventDispatcher);
        this.commandProcessor = new CommandProcessor(
            this.backendAdapter,
            this.errorManager,
            this.postMessage.bind(this)
        );

        this.eventSubscriber = new EventSubscriber(
            this.internalEventDispatcher,
            this.messageFormatter,
            this.postMessage.bind(this)
        );

        // Initialize message context
        this.messageContext = {
            currentChatId: null,
            setCurrentChatId: (chatId: string) => {
                this.messageContext.currentChatId = chatId;
                this.eventSubscriber.setCurrentChatId(chatId);
                this.stateManager.setCurrentChatId(chatId);
            }
        };

        // Initialize message router
        this.messageRouter = new MessageRouter(
            this.backendAdapter,
            this.stateManager,
            this.commandProcessor,
            this.errorManager,
            this.postMessage.bind(this),
            this.messageContext
        );

        // Subscribe to state changes for debugging/logging
        this.stateManager.subscribeToStateChanges((state, changedFields) => {
            console.log('[WebviewProvider] State changed:', changedFields, state);
        });
    }

    public resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView;
        this.setupWebview();
        this.setupMessageHandling();
        this.eventSubscriber.subscribeToEvents();

        // Set initial connection state
        this.stateManager.setConnected(true);
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
            async (message) => {
                try {
                    await this.messageRouter.handleMessage(message);
                } catch (error) {
                    console.error('[WebviewProvider] Error handling message:', error);
                    this.errorManager.handleUnexpectedError(
                        error as Error,
                        'WebviewProvider.setupMessageHandling',
                        this.messageContext.currentChatId
                    );
                }
            },
            null,
            this.disposables
        );
    }

    // Public interface methods
    public requestShowHistory(): void {
        this.postMessage('showHistory', {});
    }

    public startNewChat(): void {
        try {
            // Crear nuevo chat a través del conversationManager
            const newChatId = this.conversationManager.createNewChat();
            
            // Asegurarse de que el chat está marcado como activo
            const activeChatId = this.conversationManager.getActiveChatId();
            
            // Actualizar el contexto del mensaje
            this.messageContext.setCurrentChatId(newChatId);
            
            // Notificar a la UI
            this.postMessage('newChatStarted', {
                chatId: newChatId,
                activeChatId: activeChatId
            });
        } catch (error) {
            this.errorManager.handleUnexpectedError(
                error as Error,
                'WebviewProvider.startNewChat',
                this.messageContext.currentChatId
            );
        }
    }

    // State access methods
    public getState() {
        return this.stateManager.getState();
    }

    public getCurrentChatId(): string | null {
        return this.messageContext.currentChatId;
    }

    // Private helper methods
    private postMessage(type: string, payload: any): void {
        if (this.view) {
            this.view.webview.postMessage({ type, payload });
        } else {
            console.warn(`[WebviewProvider] View not available. Cannot post message: Type: ${type}`);
        }
    }

    private getNonce(): string {
        return crypto.randomBytes(16).toString('hex');
    }

    public dispose(): void {
        // Set disconnected state
        this.stateManager.setConnected(false);

        // Dispose all components
        this.disposables.forEach(d => d.dispose());
        this.eventSubscriber.dispose();
        this.stateManager.dispose();

        console.log('[WebviewProvider] Disposed successfully');
    }
}