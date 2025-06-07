// src/vscode/webView/handlers/MessageRouter.ts
import { CommandProcessor } from './CommandProcessor';
import { ErrorManager } from './ErrorManager';
import { IWebviewBackend } from '../core/WebviewBackendAdapter';
import { WebviewStateManager } from '../core/WebviewStateManager';



export class MessageRouter {
    constructor(
        private readonly backend: IWebviewBackend,
        private readonly stateManager: WebviewStateManager,
        private readonly commandProcessor: CommandProcessor,
        private readonly errorManager: ErrorManager,
        private readonly postMessage: (type: string, payload: any) => void,

        private readonly startNewChat: () => string
    ) { }

    public async handleMessage(message: any): Promise<void> {
        const chatId = this.stateManager.getChatState().currentChatId;
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

                    this.startNewChat();
                    break;
                case 'command':

                    await this.commandProcessor.processCommand(message.payload);
                    break;
                default:
                    console.warn('[MessageRouter] Unknown message type:', message.type);
                    break;
            }
        } catch (error: any) {
            this.errorManager.handleUnexpectedError(error, 'MessageRouter.handleMessage', chatId);
        }
    }

    private async handleUIReady(): Promise<void> {

        let chatId = this.backend.getActiveChatId();
        if (!chatId) {
            chatId = this.startNewChat();
        }

        if (!chatId) {
            this.errorManager.handleSystemError(
                'Failed to initialize chat session on UI ready.',
                'MessageRouter.handleUIReady',
                null
            );
        }

    }

    private async handleUserMessage(payload: { text: string; files?: string[] }): Promise<void> {
        let chatId = this.stateManager.getChatState().currentChatId;
        try {
            if (!payload.text?.trim()) {
                this.errorManager.handleSystemError('Message cannot be empty.', 'MessageRouter.handleUserMessage', chatId);
                return;
            }


            if (!chatId) {
                chatId = this.startNewChat();
            }


            this.backend.processMessage(chatId, payload.text, {
                files: payload.files || []
            }).catch(error => {
                console.error('[MessageRouter] Backend processing failed to start:', error);
                this.errorManager.handleUnexpectedError(error, 'MessageRouter.handleUserMessage', chatId);
            });

        } catch (error) {
            this.errorManager.handleUnexpectedError(error as Error, 'MessageRouter.handleUserMessage', chatId);
        }
    }



    private async handleSwitchModel(payload: { modelType: string }): Promise<void> {
        const chatId = this.stateManager.getChatState().currentChatId;
        try {
            if (!payload?.modelType) {
                this.errorManager.handleSystemError('No model type specified.', 'MessageRouter.handleSwitchModel', chatId);
                return;
            }

            await this.backend.switchModel(payload.modelType as 'gemini' | 'ollama');
            this.stateManager.setCurrentModel(payload.modelType);
            this.postMessage('modelSwitched', { modelType: payload.modelType });

        } catch (error: any) {
            this.errorManager.handleUnexpectedError(error, 'MessageRouter.handleSwitchModel', chatId);
        }
    }
}