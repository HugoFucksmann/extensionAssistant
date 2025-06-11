// WebviewMessageHandler.ts
import { UIToExtensionMessage } from '../types/messages';
import { WebviewBackendAdapter } from '../adapters/WebviewBackendAdapter';
import { WebviewEventAdapter } from '../adapters/WebviewEventAdapter';

export class WebviewMessageHandler {
    constructor(
        private backendAdapter: WebviewBackendAdapter,
        private eventAdapter: WebviewEventAdapter,
        private postMessage: (type: string, payload: any) => void
    ) { }

    async handleMessage(message: UIToExtensionMessage): Promise<void> {
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
                    await this.handleNewChat();
                    break;
                case 'command':
                    await this.handleCommand(message.payload);
                    break;
                default:
                    console.warn('[MessageHandler] Unknown message type:', message);
            }
        } catch (error) {
            this.postMessage('systemError', {
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    private async handleUIReady(): Promise<void> {
        const result = await this.backendAdapter.initializeSession();
        if (result.success) {
            // Set the chat ID in event adapter for proper event filtering
            this.eventAdapter.setChatId(result.data.chatId);
            this.postMessage('sessionReady', result.data);
        } else {
            this.postMessage('systemError', { message: result.error?.message });
        }
    }

    private async handleUserMessage(payload: { text: string; files?: string[] }): Promise<void> {
        const result = await this.backendAdapter.processUserMessage(payload.text, payload.files);
        if (!result.success) {
            this.postMessage('systemError', { message: result.error?.message });
        }
    }

    private async handleSwitchModel(payload: { modelType: string }): Promise<void> {
        const result = await this.backendAdapter.switchModel(payload.modelType as 'gemini' | 'ollama');
        if (result.success) {
            this.postMessage('modelSwitched', { modelType: payload.modelType });
        } else {
            this.postMessage('systemError', { message: result.error?.message });
        }
    }

    private async handleNewChat(): Promise<void> {
        const result = await this.backendAdapter.createNewChat();
        if (result.success) {
            this.postMessage('newChatStarted', result.data);
        } else {
            this.postMessage('systemError', { message: result.error?.message });
        }
    }

    private async handleCommand(payload: { command: string;[key: string]: any }): Promise<void> {
        const result = await this.backendAdapter.executeCommand(payload.command, payload);
        if (result.success) {
            // Handle specific command responses
            switch (payload.command) {
                case 'getProjectFiles':
                    this.postMessage('projectFiles', result.data);
                    break;
                default:
                    this.postMessage(payload.command + 'Result', result.data);
            }
        } else {
            this.postMessage('systemError', { message: result.error?.message });
        }
    }
}