// src/vscode/webView/handlers/CommandProcessor.ts
import { IWebviewBackend } from '../core/WebviewBackendAdapter';
import { ErrorManager } from './ErrorManager';
// CAMBIO: Se importa WebviewStateManager para obtener el estado.
import { WebviewStateManager } from '../core/WebviewStateManager';

export interface CommandPayload {
    command: string;
    [key: string]: any;
}

export class CommandProcessor {
    constructor(
        private readonly backend: IWebviewBackend,
        private readonly errorManager: ErrorManager,
        // CAMBIO: Se inyecta el stateManager.
        private readonly stateManager: WebviewStateManager,
        private readonly postMessage: (type: string, payload: any) => void
    ) { }

    public async processCommand(payload: CommandPayload): Promise<void> {
        switch (payload.command) {
            case 'getProjectFiles':
                await this.handleGetProjectFiles();
                break;
            default:
                console.warn('[CommandProcessor] Unknown command:', payload.command);
                break;
        }
    }

    private async handleGetProjectFiles(): Promise<void> {
        // CAMBIO: Se obtiene el chatId del estado central.
        const chatId = this.stateManager.getChatState().currentChatId;
        try {
            // CAMBIO: Se elimina la lógica de creación de chat. El comando asume que la sesión existe.
            if (!chatId) {
                this.errorManager.handleSystemError(
                    'Cannot get project files without an active chat session.',
                    'CommandProcessor.handleGetProjectFiles',
                    null
                );
                return;
            }

            const filePaths = await this.backend.getProjectFiles();
            this.postMessage('projectFiles', { files: filePaths });
        } catch (error: any) {
            this.errorManager.handleUnexpectedError(error, 'CommandProcessor.handleGetProjectFiles', chatId);
        }
    }
}