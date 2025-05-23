// src/vscode/WebviewMessageHandler.ts
import * as vscode from 'vscode';
import { ChatService } from '../../core/ChatService';
import { SessionManager } from './SessionManager';
import { EventBus } from '../../features/events/EventBus';
import { HistoryEntry, WindsurfState } from '../../shared/types'; // AÑADIR IMPORTACIÓN

export class WebviewMessageHandler {
    private eventBus: EventBus;

    constructor(
        private chatService: ChatService,
        private sessionManager: SessionManager,
        private postMessage: (type: string, payload: any) => void
    ) {
        this.eventBus = EventBus.getInstance();
    }

    async handle(message: any): Promise<void> {
        console.log('[WebviewMessageHandler] Received:', message.type, JSON.stringify(message.payload));

        try {
            switch (message.type) {
                case 'webview:ready':
                    await this.handleUIReady();
                    break;
                case 'webview:sendMessage':
                    await this.handleUserMessage(message.payload.text, message.payload.files, message.payload.chatId);
                    break;
                case 'webview:requestNewChat':
                    this.handleNewChat();
                    break;
                case 'webview:loadChat':
                    await this.handleLoadChat(message.payload.chatId);
                    break;
                case 'webview:clearChat': // Asumiendo que la UI envía chatId
                    this.handleClearChat(message.payload.chatId);
                    break;
                case 'webview:getFileContents':
                    await this.handleGetFileContents(message.payload.filePath);
                    break;
                case 'webview:getProjectFiles':
                    await this.handleGetProjectFiles();
                    break;
                case 'webview:switchModel': // Asumiendo que la UI envía modelType
                    this.handleSwitchModel(message.payload.modelType);
                    break;
                default:
                    console.warn(`[WebviewMessageHandler] Unhandled message type: ${message.type}`);
            }
        } catch (error: any) {
            this.eventBus.error('Message handler error', error, { messageType: message.type, errorMessage: error.message }, 'WebviewMessageHandler');
            this.postMessage('extension:systemError', {
                message: error.message || 'Unknown error in message handler',
                source: 'WebviewMessageHandler'
            });
        }
    }

    private async handleUIReady(): Promise<void> {
        const sessionInfo = await this.sessionManager.initializeOrRestore();
        let messages: any[] = [];
        let chatIdForUI: string | undefined = sessionInfo.chatId;

        if (chatIdForUI) {
          const state = this.chatService.getChatStateManager().getConversationState(chatIdForUI);
          messages = state?.history?.filter((h: HistoryEntry) => // TIPAR h
              h.phase === 'user_input' || (h.phase === 'action' && h.sender === 'assistant')
          ).map((h: HistoryEntry) => ({ // TIPAR h
              id: h.id,
              content: h.content,
              sender: h.sender,
              timestamp: h.timestamp,
              metadata: h.metadata || {}
          })) || [];
            this.eventBus.info('UIReady: Session restored/initialized.', { chatId: chatIdForUI, messagesCount: messages.length, restored: sessionInfo.restored }, 'WebviewMessageHandler');
        } else {
            this.eventBus.info('UIReady: No active chat to restore. UI should handle empty state.', {}, 'WebviewMessageHandler');
        }

        this.postMessage('extension:sessionReady', {
            chatId: chatIdForUI,
            messages,
            isNew: !chatIdForUI || !sessionInfo.restored, // Es nuevo si no hay chatId o si no fue restaurado
            restored: sessionInfo.restored && !!chatIdForUI, // Es restaurado si SessionManager lo dice y hay un chatId
        });
    }

    private async handleUserMessage(text: string, files: string[], uiChatId: string | undefined): Promise<void> {
        if (!uiChatId) {
            this.eventBus.warn('User message received without chatId.', { textPreview: text?.substring(0,20) }, 'WebviewMessageHandler');
            this.postMessage('extension:systemError', { message: 'Chat ID is required to send a message.', source: 'WebviewMessageHandler' });
            return;
        }

        this.sessionManager.setActiveChatId(uiChatId); // Sincroniza y guarda
        const currentChatId = this.sessionManager.getCurrentChatId();

        if (!currentChatId || !this.sessionManager.isActive() || currentChatId !== uiChatId) {
            const errorMsg = `Chat session not active or Chat ID mismatch. UI: ${uiChatId}, Backend: ${currentChatId}`;
            this.eventBus.error(errorMsg, undefined, {}, 'WebviewMessageHandler');
            this.postMessage('extension:systemError', { message: errorMsg, source: 'WebviewMessageHandler' });
            return;
        }

        if (!text?.trim() && (!files || files.length === 0)) {
            this.postMessage('extension:systemError', { message: 'Message cannot be empty.', source: 'WebviewMessageHandler', chatId: currentChatId });
            return;
        }

        this.postMessage('extension:processingUpdate', {
            type: 'SET_PHASE',
            payload: 'processing_message',
            chatId: currentChatId
        });

        const contextData = {
            files: files || [],
            editorContext: await this.getEditorContext() // Considerar si esto es siempre necesario o bajo demanda
        };

        await this.chatService.processUserMessage(currentChatId, text, contextData);
    }

    private handleNewChat(): void {
        const newChatId = this.sessionManager.startNewChat();
        this.postMessage('extension:newChatStarted', { chatId: newChatId, messages: [] });
        this.eventBus.info('New chat started by UI request', { chatId: newChatId }, 'WebviewMessageHandler');
    }

    private async handleLoadChat(chatId: string): Promise<void> {
        if (!chatId) {
            this.postMessage('extension:systemError', { message: 'Cannot load chat: Chat ID is missing.', source: 'WebviewMessageHandler' });
            return;
        }
        this.sessionManager.setActiveChatId(chatId);

        const state = this.chatService.getChatStateManager().getConversationState(chatId);
        if (!state) {
            this.postMessage('extension:systemError', { message: `Chat ${chatId} not found.`, source: 'WebviewMessageHandler', chatId });
            return;
        }

        const messages = state.history?.filter(h =>
            h.phase === 'user_input' || (h.phase === 'action' && h.sender === 'assistant')
        ).map(h => ({
            id: h.id,
            content: h.content,
            sender: h.sender,
            timestamp: h.timestamp,
            metadata: h.metadata || {}
        })) || [];

        this.postMessage('extension:chatLoaded', { chatId, messages });
        this.eventBus.info('Chat loaded by UI request', { chatId, messageCount: messages.length }, 'WebviewMessageHandler');
    }

    private handleClearChat(chatId: string | undefined): void {
        const targetChatId = chatId || this.sessionManager.getCurrentChatId();
        if (!targetChatId) {
            this.postMessage('extension:systemError', { message: 'Cannot clear chat: Chat ID is unknown.', source: 'WebviewMessageHandler'});
            this.eventBus.warn('Clear chat requested without a target Chat ID.', {}, 'WebviewMessageHandler');
            return;
        }
        this.chatService.clearConversation(targetChatId);
        this.postMessage('extension:chatCleared', { chatId: targetChatId });
        this.eventBus.info('Chat cleared by UI request', { chatId: targetChatId }, 'WebviewMessageHandler');
        // Si el chat borrado era el actual, ¿deberíamos iniciar uno nuevo o dejar la UI vacía?
        // Por ahora, la UI se encarga de su estado tras la confirmación.
        // if (targetChatId === this.sessionManager.getCurrentChatId()) {
        //    this.sessionManager.clearPersistedChatId(); // Opcional: si borrar implica no volver a él.
        // }
    }

    private async handleGetFileContents(filePath: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(filePath);
            const content = await vscode.workspace.fs.readFile(uri);
            const text = new TextDecoder().decode(content);
            this.postMessage('extension:fileContentsLoaded', { filePath, content });
        } catch (error: any) {
            this.eventBus.error('Failed to read file', error, { filePath }, 'WebviewMessageHandler');
            this.postMessage('extension:systemError', { message: `Failed to read file: ${filePath}. ${error.message}`, source: 'WebviewMessageHandler' });
        }
    }

    private async handleGetProjectFiles(): Promise<void> {
        try {
            const files: string[] = [];
            if (vscode.workspace.workspaceFolders) {
                for (const folder of vscode.workspace.workspaceFolders) {
                    const pattern = new vscode.RelativePattern(folder, '**/*');
                    const uris = await vscode.workspace.findFiles(
                        pattern,
                        '{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/out/**,**/.vscode-test/**}' // Mejorar exclusiones
                    );
                    files.push(...uris.map(uri => uri.fsPath));
                }
            }
            this.postMessage('extension:projectFilesLoaded', { files });
        } catch (error: any) {
            this.eventBus.error('Failed to load project files', error, {}, 'WebviewMessageHandler');
            this.postMessage('extension:systemError', { message: `Failed to load project files. ${error.message}`, source: 'WebviewMessageHandler' });
        }
    }

    private handleSwitchModel(modelType: string): void {
        // TODO: Implement actual model switching through chat service or model manager
        vscode.workspace.getConfiguration('extensionAssistant').update('modelType', modelType, vscode.ConfigurationTarget.Global);
        this.postMessage('extension:modelSwitched', { modelType });
        this.eventBus.info('Model switched (config updated)', { modelType }, 'WebviewMessageHandler');
    }

    private async getEditorContext(): Promise<any> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return null;

        return {
            fileName: editor.document.fileName,
            languageId: editor.document.languageId,
            selection: editor.selection ? {
                start: { line: editor.selection.start.line, character: editor.selection.start.character },
                end: { line: editor.selection.end.line, character: editor.selection.end.character },
                text: editor.document.getText(editor.selection)
            } : null,
            // fullText: editor.document.getText() // Cuidado con archivos grandes
        };
    }

    // generateChatTitle no se usa aquí, sino en el lado de la UI o ChatService si es necesario
}