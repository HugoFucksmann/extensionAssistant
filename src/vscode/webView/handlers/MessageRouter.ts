// src/vscode/webView/handlers/MessageRouter.ts
import { CommandProcessor } from './CommandProcessor';
import { ErrorManager } from './ErrorManager';
import { IWebviewBackend } from '../core/WebviewBackendAdapter';
import { WebviewStateManager } from '../core/WebviewStateManager';

export interface MessageContext {
    currentChatId: string | null;
    setCurrentChatId: (chatId: string) => void;
}

export class MessageRouter {
    constructor(
        private readonly backend: IWebviewBackend,
        private readonly stateManager: WebviewStateManager,
        private readonly commandProcessor: CommandProcessor,
        private readonly errorManager: ErrorManager,
        private readonly postMessage: (type: string, payload: any) => void,
        private readonly context: MessageContext
    ) { }

    public async handleMessage(message: any): Promise<void> {
        try {
            switch (message.type) {
                case 'uiReady':
                    await this.handleUIReady();
                    break;
                case 'userMessageSent':
                    await this.handleUserMessage(message.payload);
                    break;
                case 'switchModel':
                    await this.handleSwitchModel(message.payload);
                    break;
                case 'newChatRequestedByUI':
                    this.handleNewChatRequest();
                    break;
                case 'command':
                    await this.commandProcessor.processCommand(message.payload, this.context);
                    break;
                default:
                    console.warn('[MessageRouter] Unknown message type:', message.type);
                    break;
            }
        } catch (error: any) {
            this.errorManager.handleUnexpectedError(error, 'MessageRouter.handleMessage', this.context.currentChatId);
        }
    }

    private async handleUIReady(): Promise<void> {
        try {
            // Centralizar la lógica de creación de chat y contexto
            let chatId = this.backend.getActiveChatId();
            if (!chatId) {
                // Usar el flujo centralizado de WebviewProvider
                if (typeof (this as any).webviewProvider?.startNewChatFlow === 'function') {
                    chatId = (this as any).webviewProvider.startNewChatFlow();
                } else {
                    chatId = this.backend.createNewChat();
                }
            }

            if (!chatId) {
                this.errorManager.handleSystemError(
                    'Failed to initialize chat session on UI ready.',
                    'MessageRouter.handleUIReady',
                    this.context.currentChatId
                );
                return;
            }

            this.context.setCurrentChatId(chatId);
            this.postMessage('sessionReady', {
                chatId: chatId,
                messages: [],
            });
        } catch (error: any) {
            this.errorManager.handleUnexpectedError(error, 'MessageRouter.handleUIReady', this.context.currentChatId);
        }
    }

    private async handleUserMessage(payload: { text: string; files?: string[] }): Promise<void> {
        try {
            if (!payload.text?.trim()) {
                this.errorManager.handleSystemError(
                    'Message cannot be empty.',
                    'MessageRouter.handleUserMessage',
                    this.context.currentChatId
                );
                return;
            }

            let chatId = this.context.currentChatId;
            console.log('[MessageRouter] Current chat ID:', chatId);

            if (!chatId) {
                chatId = this.backend.createNewChat();
                if (!chatId) {
                    this.errorManager.handleSystemError(
                        'Failed to create or retrieve chat session for user message.',
                        'MessageRouter.handleUserMessage',
                        null
                    );
                    return;
                }
                this.context.setCurrentChatId(chatId);
            }

            console.log('[MessageRouter] Calling backend.processMessage in the background...');
            // Do not await. Let the process run and rely on events for feedback.
            this.backend.processMessage(chatId, payload.text, {
                files: payload.files || []
            }).catch(error => {
                // Catch any unexpected errors from the async process start itself
                console.error('[MessageRouter] Backend processing failed to start:', error);
                this.postMessage('systemError', {
                    content: error instanceof Error ? error.message : 'Error inesperado al iniciar el procesamiento',
                    metadata: { status: 'error' }
                });
            });

            // The function now returns immediately. All feedback will be sent via EventSubscriber.

        } catch (error) {
            console.error('[MessageRouter] Exception in handleUserMessage:', error);
            this.postMessage('systemError', {
                content: error instanceof Error ? error.message : 'Error inesperado',
                metadata: { status: 'error' }
            });
        }
    }

    private handleNewChatRequest(): void {
        try {
            // Delegar en el flujo centralizado de WebviewProvider si está disponible
            if (typeof (this as any).webviewProvider?.startNewChatFlow === 'function') {
                (this as any).webviewProvider.startNewChatFlow();
            } else {
                const newChatId = this.backend.createNewChat();
                const activeChatId = this.backend.getActiveChatId();
                this.context.setCurrentChatId(newChatId);
                this.postMessage('newChatStarted', {
                    chatId: newChatId,
                    activeChatId: activeChatId
                });
            }
        } catch (error: any) {
            this.errorManager.handleUnexpectedError(error, 'MessageRouter.handleNewChatRequest', this.context.currentChatId);
        }
    }

    private async handleSwitchModel(payload: { modelType: string }): Promise<void> {
        try {
            if (!payload?.modelType) {
                this.errorManager.handleSystemError(
                    'No model type specified for switching.',
                    'MessageRouter.handleSwitchModel',
                    this.context.currentChatId
                );
                return;
            }

            await this.backend.switchModel(payload.modelType as 'gemini' | 'ollama');
            this.stateManager.setCurrentModel(payload.modelType);
            this.postMessage('modelSwitched', { modelType: payload.modelType });

        } catch (error: any) {
            this.errorManager.handleUnexpectedError(error, 'MessageRouter.handleSwitchModel', this.context.currentChatId);
        }
    }
}