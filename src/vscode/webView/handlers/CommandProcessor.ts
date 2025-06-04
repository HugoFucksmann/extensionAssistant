// src/vscode/webView/handlers/CommandProcessor.ts
import { IWebviewBackend } from '../core/WebviewBackendAdapter';
import { ErrorManager } from './ErrorManager';
import { MessageContext } from './MessageRouter';

export interface CommandPayload {
    command: string;
    [key: string]: any;
}

export class CommandProcessor {
    constructor(
        private readonly backend: IWebviewBackend,
        private readonly errorManager: ErrorManager,
        private readonly postMessage: (type: string, payload: any) => void
    ) { }

    public async processCommand(payload: CommandPayload, context: MessageContext): Promise<void> {
        switch (payload.command) {
            case 'getProjectFiles':
                await this.handleGetProjectFiles(context);
                break;
            default:
                console.warn('[CommandProcessor] Unknown command:', payload.command);
                break;
        }
    }

    private async handleGetProjectFiles(context: MessageContext): Promise<void> {
        try {
            let chatId = context.currentChatId;
            if (!chatId) {
                chatId = this.backend.createNewChat();
                if (!chatId) {
                    this.errorManager.handleSystemError(
                        'Failed to create or retrieve chat session for getProjectFiles.',
                        'CommandProcessor.handleGetProjectFiles',
                        null
                    );
                    return;
                }
                context.setCurrentChatId(chatId);
            }

            const filePaths = await this.backend.getProjectFiles();
            this.postMessage('projectFiles', { files: filePaths });
        } catch (error: any) {
            this.errorManager.handleUnexpectedError(error, 'CommandProcessor.handleGetProjectFiles', context.currentChatId);
        }
    }
}