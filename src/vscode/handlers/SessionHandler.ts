import { WebviewMessage } from 'src/ui/types/WebviewTypes';

import { EventBus } from '../../features/events/EventBus';
import { SessionManager } from '@vscode/webView/SessionManager';
import { HistoryEntry } from '@shared/types';

export class SessionHandler {
    private eventBus: EventBus;
    private disposed: boolean = false;

    constructor(
        private postMessage: (type: string, payload: any) => void,
        private sessionManager: SessionManager
    ) {
        this.eventBus = EventBus.getInstance();
    }

    public async handleUIReady(): Promise<void> {
        if (this.disposed) return;

        const sessionInfo = await this.sessionManager.initializeOrRestore();
        let messages: any[] = [];
        let chatIdForUI: string | undefined = sessionInfo.chatId;

        // NOTE: SessionHandler does not have access to chatService, so we cannot fetch conversation state here.
        // If you need to return messages, you must refactor to pass chatService or fetch messages elsewhere.
        // For now, just log session info and send empty messages array.
        if (chatIdForUI) {
            // TODO: Fetch messages if possible, or refactor to inject chatService
            messages = [];
            this.eventBus.info('UIReady: Session restored/initialized.', { 
                chatId: chatIdForUI, 
                messagesCount: messages.length, 
                restored: sessionInfo.restored 
            }, 'SessionHandler');
        } else {
            this.eventBus.info('UIReady: No active chat to restore. UI should handle empty state.', {}, 'SessionHandler');
        }

        this.postMessage('extension:sessionReady', {
            chatId: chatIdForUI,
            messages,
            isNew: !chatIdForUI || !sessionInfo.restored,
            restored: sessionInfo.restored && !!chatIdForUI,
        });
    }

    public handleSwitchModel(message: WebviewMessage): Promise<void> {
        if (this.disposed) return Promise.resolve();

        const { payload } = message;
        const modelType = payload.modelType as string;

        // TODO: Implement model switching logic
        this.eventBus.info('Model switched by UI request', { modelType }, 'SessionHandler');
        return Promise.resolve();
    }

    public dispose(): void {
        this.disposed = true;
    }
}
