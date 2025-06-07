// src/vscode/webView/core/WebviewStateManager.ts
export interface UIState {
    isSidebarVisible: boolean;
    isDarkMode: boolean;
    currentView: 'chat' | 'settings' | 'history';
    isLoading: boolean;
}

export interface ChatState {
    currentChatId: string | null;
    activeChatId: string | null;
    messageCount: number;
    lastActivity: number;
}

export interface SystemState {
    currentModel: string | null;
    isConnected: boolean;
    lastError: string | null;
}

export interface WebviewState {
    ui: UIState;
    chat: ChatState;
    system: SystemState;
}

export type StateChangeCallback = (state: WebviewState, changedFields: string[]) => void;

export class WebviewStateManager {
    private state: WebviewState = {
        ui: {
            isSidebarVisible: true,
            isDarkMode: false,
            currentView: 'chat',
            isLoading: false
        },
        chat: {
            currentChatId: null,
            activeChatId: null,
            messageCount: 0,
            lastActivity: Date.now()
        },
        system: {
            currentModel: null,
            isConnected: false,
            lastError: null
        }
    };

    private subscribers: StateChangeCallback[] = [];

    public setCurrentModel(model: string): void {
        this.updateSystemState({ currentModel: model });
    }

    public getSidebarVisibility(): boolean {
        return this.state.ui.isSidebarVisible;
    }

    public getDarkMode(): boolean {
        return this.state.ui.isDarkMode;
    }

    // Enhanced state management methods
    public getState(): WebviewState {
        return { ...this.state };
    }

    public getUIState(): UIState {
        return { ...this.state.ui };
    }

    public getChatState(): ChatState {
        return { ...this.state.chat };
    }

    public getSystemState(): SystemState {
        return { ...this.state.system };
    }

    public updateUIState(updates: Partial<UIState>): void {
        const changedFields = this.getChangedFields('ui', updates);
        if (changedFields.length > 0) {
            this.state.ui = { ...this.state.ui, ...updates };
            this.notifySubscribers(changedFields);
        }
    }

    public updateChatState(updates: Partial<ChatState>): void {
        const changedFields = this.getChangedFields('chat', updates);
        if (changedFields.length > 0) {
            this.state.chat = { ...this.state.chat, ...updates };
            if (updates.currentChatId || updates.activeChatId) {
                this.state.chat.lastActivity = Date.now();
            }
            this.notifySubscribers(changedFields);
        }
    }

    public updateSystemState(updates: Partial<SystemState>): void {
        const changedFields = this.getChangedFields('system', updates);
        if (changedFields.length > 0) {
            this.state.system = { ...this.state.system, ...updates };
            this.notifySubscribers(changedFields);
        }
    }

    public setCurrentChatId(chatId: string | null): void {
        this.updateChatState({ currentChatId: chatId });
    }

    public setActiveChatId(chatId: string | null): void {
        this.updateChatState({ activeChatId: chatId });
    }

    public incrementMessageCount(): void {
        this.updateChatState({
            messageCount: this.state.chat.messageCount + 1,
            lastActivity: Date.now()
        });
    }

    public setLoading(isLoading: boolean): void {
        this.updateUIState({ isLoading });
    }

    public setConnected(isConnected: boolean): void {
        this.updateSystemState({ isConnected });
    }

    public setLastError(error: string | null): void {
        this.updateSystemState({ lastError: error });
    }

    public setSidebarVisibility(visible: boolean): void {
        this.updateUIState({ isSidebarVisible: visible });
    }

    public setDarkMode(enabled: boolean): void {
        this.updateUIState({ isDarkMode: enabled });
    }

    public setCurrentView(view: UIState['currentView']): void {
        this.updateUIState({ currentView: view });
    }

    // Subscription management
    public subscribeToStateChanges(callback: StateChangeCallback): () => void {
        this.subscribers.push(callback);

        // Return unsubscribe function
        return () => {
            const index = this.subscribers.indexOf(callback);
            if (index > -1) {
                this.subscribers.splice(index, 1);
            }
        };
    }

    public reset(): void {
        const initialState: WebviewState = {
            ui: {
                isSidebarVisible: true,
                isDarkMode: false,
                currentView: 'chat',
                isLoading: false
            },
            chat: {
                currentChatId: null,
                activeChatId: null,
                messageCount: 0,
                lastActivity: Date.now()
            },
            system: {
                currentModel: null,
                isConnected: false,
                lastError: null
            }
        };

        this.state = initialState;
        this.notifySubscribers(['ui', 'chat', 'system']);
    }

    // Private helper methods
    private getChangedFields(section: keyof WebviewState, updates: any): string[] {
        const changedFields: string[] = [];
        const currentSection = this.state[section] as any;

        for (const key in updates) {
            if (updates[key] !== currentSection[key]) {
                changedFields.push(`${section}.${key}`);
            }
        }

        return changedFields;
    }

    private notifySubscribers(changedFields: string[]): void {
        if (this.subscribers.length > 0 && changedFields.length > 0) {
            const stateSnapshot = this.getState();
            this.subscribers.forEach(callback => {
                try {
                    callback(stateSnapshot, changedFields);
                } catch (error) {
                    console.error('[WebviewStateManager] Error in state change callback:', error);
                }
            });
        }
    }

    public dispose(): void {
        this.subscribers = [];
    }
}