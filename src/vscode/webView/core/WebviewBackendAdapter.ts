// src/vscode/webView/core/WebviewBackendAdapter.ts
import * as vscode from 'vscode'; // Se utiliza el import estándar
import { ApplicationLogicService } from '../../../core/ApplicationLogicService';
import { IConversationManager } from '../../../core/interfaces/IConversationManager';

export interface ProcessMessageOptions {
    files?: string[];
}

export interface ProcessMessageResult {
    success: boolean;
    error?: string;
    updatedState?: any;
}

export interface IWebviewBackend {
    processMessage(chatId: string, text: string, options: ProcessMessageOptions): Promise<ProcessMessageResult>;
    createNewChat(): string;
    getActiveChatId(): string | null;
    switchModel(modelType: 'gemini' | 'ollama'): Promise<void>;
    getProjectFiles(): Promise<any[]>;
}

export class WebviewBackendAdapter implements IWebviewBackend {
    constructor(
        private readonly appLogicService: ApplicationLogicService,
        private readonly conversationManager: IConversationManager
    ) { }

    // [ASÍNCRONO] La respuesta conversacional NO se retorna aquí. La UI debe escuchar los eventos emitidos por el backend.
    public async processMessage(
        chatId: string,
        text: string,
        options: ProcessMessageOptions = {}
    ): Promise<ProcessMessageResult> {
        try {
            const result = await this.appLogicService.processUserMessage(
                chatId,
                text,
                { files: options.files || [] }
            );

            // No retornar la respuesta conversacional aquí, solo control de flujo y estado.
            return {
                success: result.success,
                error: result.error,
                updatedState: result.updatedState
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'An unexpected error occurred during message processing.',
                updatedState: undefined
            };
        }
    }

    public createNewChat(): string {
        return this.conversationManager.createNewChat();
    }

    public getActiveChatId(): string | null {
        return this.conversationManager.getActiveChatId();
    }

    public async switchModel(modelType: 'gemini' | 'ollama'): Promise<void> {
        const { ComponentFactory } = await import('../../../core/ComponentFactory');
        const modelManager = ComponentFactory.getModelManager();
        modelManager.setActiveProvider(modelType);
    }

    public async getProjectFiles(): Promise<any[]> {
        const { listFilesUtil } = await import('../../../shared/utils/listFiles');
        // Call without search pattern to get all files
        const files = await listFilesUtil(vscode);
        return files; // Return full file objects with name and path
    }
}