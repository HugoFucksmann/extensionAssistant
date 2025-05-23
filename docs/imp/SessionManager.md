// src/vscode/managers/SessionManager.ts
import * as vscode from 'vscode';

const CURRENT_CHAT_ID_KEY = 'extensionAssistant.currentChatId';

export class SessionManager {
    private currentChatId: string | undefined;
    private isSessionActive = false;
    private extensionContext: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.extensionContext = context;
        this.loadCurrentChatId();
    }

    private loadCurrentChatId(): void {
        const persistedId = this.extensionContext.globalState.get<string>(CURRENT_CHAT_ID_KEY);
        if (persistedId) {
            this.currentChatId = persistedId;
            this.isSessionActive = true;
            console.log(`[SessionManager] Restored currentChatId: ${this.currentChatId}`);
        }
    }

    private saveCurrentChatId(): void {
        if (this.currentChatId) {
            this.extensionContext.globalState.update(CURRENT_CHAT_ID_KEY, this.currentChatId);
            console.log(`[SessionManager] Saved currentChatId: ${this.currentChatId}`);
        } else {
            this.extensionContext.globalState.update(CURRENT_CHAT_ID_KEY, undefined);
            console.log(`[SessionManager] Cleared currentChatId in globalState.`);
        }
    }

    public getCurrentChatId(): string | undefined {
        return this.currentChatId;
    }

    public isActive(): boolean {
        return this.isSessionActive;
    }

    public startNewChat(): string {
        this.currentChatId = this.generateChatId();
        this.isSessionActive = true;
        this.saveCurrentChatId();
        console.log(`[SessionManager] New chat started: ${this.currentChatId}`);
        return this.currentChatId;
    }

    public setActiveChatId(chatId: string): void {
        if (this.currentChatId !== chatId) {
            this.currentChatId = chatId;
            this.isSessionActive = true;
            this.saveCurrentChatId();
            console.log(`[SessionManager] Active chat ID set to: ${this.currentChatId}`);
        } else if (!this.isSessionActive) {
            this.isSessionActive = true;
        }
    }

    public initializeOrRestore(): Promise<{ chatId: string | undefined; isNew: boolean; restored: boolean }> {
        if (this.isSessionActive && this.currentChatId) {
            return Promise.resolve({ chatId: this.currentChatId, isNew: false, restored: true });
        }

        if (this.currentChatId) {
            this.isSessionActive = true;
            console.log(`[SessionManager] Restored session for chatId: ${this.currentChatId}`);
            return Promise.resolve({ chatId: this.currentChatId, isNew: false, restored: true });
        }
        
        return Promise.resolve({ chatId: undefined, isNew: true, restored: false });
    }

    public endSession(): void {
        this.isSessionActive = false;
        console.log(`[SessionManager] Session ended for chatId: ${this.currentChatId}`);
    }

    public clearPersistedChatId(): void {
        const oldChatId = this.currentChatId;
        this.currentChatId = undefined;
        this.isSessionActive = false;
        this.extensionContext.globalState.update(CURRENT_CHAT_ID_KEY, undefined);
        console.log(`[SessionManager] Cleared persisted currentChatId (was: ${oldChatId})`);
    }

    private generateChatId(): string {
        return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}