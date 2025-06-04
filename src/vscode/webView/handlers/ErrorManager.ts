// src/vscode/webView/handlers/ErrorManager.ts
import { InternalEventDispatcher } from '../../../core/events/InternalEventDispatcher';
import { EventType, SystemEventPayload } from '../../../features/events/eventTypes';

export class ErrorManager {
    constructor(
        private readonly internalEventDispatcher: InternalEventDispatcher
    ) { }

    public handleSystemError(message: string, source: string, chatId: string | null, details?: Record<string, any>): void {
        const payload: SystemEventPayload = {
            message,
            level: 'error',
            chatId: chatId || undefined,
            source: `WebviewMessageHandler.${source}`,
            timestamp: Date.now(),
            details,
        };
        this.internalEventDispatcher.dispatch(EventType.SYSTEM_ERROR, payload);
    }

    public handleProcessingError(message: string, source: string, chatId: string, details?: Record<string, any>): void {
        this.handleSystemError(message, source, chatId, details);
    }

    public handleUnexpectedError(error: Error, source: string, chatId: string | null): void {
        console.error(`[ErrorManager] Unexpected error in ${source}:`, error);
        this.handleSystemError(
            error.message || 'An unexpected error occurred.',
            source,
            chatId,
            { stack: error.stack }
        );
    }
}