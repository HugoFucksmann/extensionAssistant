// src/vscode/webView/core/WebviewBackendAdapter.ts
import * as vscode from 'vscode';
import { ApplicationLogicService } from '../../../core/ApplicationLogicService';
import { IConversationManager } from '../../../core/interfaces/IConversationManager';
import { searchFiles } from '../../../shared/utils/pathUtils';

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



        const searchResults = await searchFiles(
            vscode,
            undefined,
            5000,
            false
        );


        const files = searchResults.map(result => ({
            path: result.relativePath,
            type: result.type,
            name: result.name,
            uri: result.uri
        }));

        return files;
    }
}