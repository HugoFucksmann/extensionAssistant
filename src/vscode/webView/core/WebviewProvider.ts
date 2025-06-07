// src/vscode/webView/WebviewProvider.ts - Refactored Version

import * as vscode from 'vscode';
import { getReactHtmlContent } from './htmlTemplate';
import { ApplicationLogicService } from '../../../core/ApplicationLogicService';
import { InternalEventDispatcher } from '../../../core/events/InternalEventDispatcher';
import { IConversationManager } from '../../../core/interfaces/IConversationManager';
import * as crypto from 'crypto';

import { WebviewStateManager } from './WebviewStateManager';
import { WebviewBackendAdapter } from './WebviewBackendAdapter';
import { MessageRouter } from '../handlers/MessageRouter';
import { CommandProcessor } from '../handlers/CommandProcessor';
import { ErrorManager } from '../handlers/ErrorManager';
import { EventSubscriber } from '../handlers/EventSubscriber';
import { MessageFormatter } from '../formatters/MessageFormatter';

export class WebviewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private disposables: vscode.Disposable[] = [];

    private stateManager!: WebviewStateManager;
    private backendAdapter!: WebviewBackendAdapter;
    private messageFormatter!: MessageFormatter;
    private messageRouter!: MessageRouter;
    private commandProcessor!: CommandProcessor;
    private errorManager!: ErrorManager;
    private eventSubscriber!: EventSubscriber;



    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly appLogicService: ApplicationLogicService,
        private readonly internalEventDispatcher: InternalEventDispatcher,
        private readonly conversationManager: IConversationManager
    ) {
        this.initializeComponents();
    }

    private initializeComponents(): void {
        this.stateManager = new WebviewStateManager();
        this.backendAdapter = new WebviewBackendAdapter(this.appLogicService, this.conversationManager);
        this.messageFormatter = new MessageFormatter();
        this.errorManager = new ErrorManager(this.internalEventDispatcher);


        this.commandProcessor = new CommandProcessor(
            this.backendAdapter,
            this.errorManager,
            this.stateManager,
            this.postMessage.bind(this)
        );

        this.eventSubscriber = new EventSubscriber(
            this.internalEventDispatcher,
            this.messageFormatter,
            this.stateManager,
            this.postMessage.bind(this)
        );



        this.messageRouter = new MessageRouter(
            this.backendAdapter,
            this.stateManager,
            this.commandProcessor,
            this.errorManager,
            this.postMessage.bind(this),

            this.startNewChat.bind(this)
        );

        this.stateManager.subscribeToStateChanges((state, changedFields) => {
            console.log('[WebviewProvider] State changed:', changedFields, state);
        });
    }

    public resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView;
        this.setupWebview();
        this.setupMessageHandling();
        this.eventSubscriber.subscribeToEvents();
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

                    const chatId = this.stateManager.getChatState().currentChatId;
                    this.errorManager.handleUnexpectedError(
                        error as Error,
                        'WebviewProvider.setupMessageHandling',
                        chatId
                    );
                }
            },
            null,
            this.disposables
        );
    }

    /**
     * CAMBIO: Este método ahora es la única fuente para crear un nuevo chat.
     * Centraliza la lógica, actualiza el estado y notifica a la UI.
     * @returns El ID del nuevo chat creado.
     */
    public startNewChat(): string {
        try {
            const newChatId = this.backendAdapter.createNewChat();
            const activeChatId = this.backendAdapter.getActiveChatId();


            this.stateManager.updateChatState({
                currentChatId: newChatId,
                activeChatId: activeChatId
            });


            this.postMessage('newChatStarted', {
                chatId: newChatId,
                activeChatId: activeChatId
            });


            this.postMessage('sessionReady', {
                chatId: newChatId,
                messages: [],
            });

            return newChatId;
        } catch (error) {
            const chatId = this.stateManager.getChatState().currentChatId;
            this.errorManager.handleUnexpectedError(
                error as Error,
                'WebviewProvider.startNewChat',
                chatId
            );
            return '';
        }
    }

    public requestShowHistory(): void {
        this.postMessage('showHistory', {});
    }

    public getState() {
        return this.stateManager.getState();
    }

    public getCurrentChatId(): string | null {

        return this.stateManager.getChatState().currentChatId;
    }

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
        this.stateManager.setConnected(false);
        this.disposables.forEach(d => d.dispose());
        this.eventSubscriber.dispose();
        this.stateManager.dispose();
        console.log('[WebviewProvider] Disposed successfully');
    }
}