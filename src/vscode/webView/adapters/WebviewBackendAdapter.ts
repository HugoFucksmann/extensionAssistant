// WebviewBackendAdapter.ts
import { ApplicationLogicService } from '@core/ApplicationLogicService';
import { IConversationManager } from '@core/interfaces/IConversationManager';
import { ComponentFactory } from '@core/ComponentFactory';
import { searchFiles } from '@shared/utils/pathUtils';
import * as vscode from 'vscode';

export interface OperationResult<T = any> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code?: string;
        details?: any;
    };
}

export class WebviewBackendAdapter {
    private currentChatId: string | null = null;

    constructor(
        private appLogicService: ApplicationLogicService,
        private conversationManager: IConversationManager
    ) { }

    async initializeSession(): Promise<OperationResult> {
        try {
            let chatId = this.conversationManager.getActiveChatId();
            if (!chatId) {
                chatId = this.conversationManager.createNewChat();
            }

            this.currentChatId = chatId;

            return {
                success: true,
                data: {
                    chatId,
                    messages: [],
                }
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    message: 'Failed to initialize session',
                    details: error
                }
            };
        }
    }

    async processUserMessage(text: string, files: string[] = []): Promise<OperationResult> {
        if (!text?.trim()) {
            return {
                success: false,
                error: { message: 'Message cannot be empty' }
            };
        }

        let chatId = this.currentChatId;
        if (!chatId) {
            const newChatResult = await this.createNewChat();
            if (!newChatResult.success) return newChatResult;
            chatId = newChatResult.data.chatId;
        }

        try {

            const result = await this.appLogicService.processUserMessage(
                chatId!,
                text,
                { files }
            );

            return {
                success: result.success,
                error: result.error ? { message: result.error } : undefined,
                data: result.updatedState
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Message processing failed'
                }
            };
        }
    }

    async switchModel(modelType: 'gemini' | 'ollama'): Promise<OperationResult> {
        if (!modelType || !['gemini', 'ollama'].includes(modelType)) {
            return {
                success: false,
                error: { message: 'Invalid model type' }
            };
        }

        try {
            const modelManager = ComponentFactory.getModelManager();
            modelManager.setActiveProvider(modelType); // No es async

            return { success: true, data: { modelType } };
        } catch (error) {
            return {
                success: false,
                error: {
                    message: `Failed to switch to ${modelType}: ${error instanceof Error ? error.message : String(error)}`
                }
            };
        }
    }

    async createNewChat(): Promise<OperationResult> {
        try {
            const chatId = this.conversationManager.createNewChat();
            const activeChatId = this.conversationManager.getActiveChatId();

            this.currentChatId = chatId;

            return {
                success: true,
                data: { chatId, activeChatId }
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    message: 'Failed to create new chat',
                    details: error
                }
            };
        }
    }

    async executeCommand(command: string, payload: any): Promise<OperationResult> {
        switch (command) {
            case 'getProjectFiles':
                return this.getProjectFiles();
            default:
                return {
                    success: false,
                    error: { message: `Unknown command: ${command}` }
                };
        }
    }

    private async getProjectFiles(): Promise<OperationResult> {
        try {
            const searchResults = await searchFiles(vscode, undefined, 5000, false);
            const files = searchResults.map(result => ({
                path: result.relativePath,
                type: result.type,
                name: result.name,
                uri: result.uri
            }));

            return { success: true, data: { files } };
        } catch (error) {
            return {
                success: false,
                error: {
                    message: 'Failed to get project files',
                    details: error
                }
            };
        }
    }

    getCurrentChatId(): string | null {
        return this.currentChatId;
    }
}