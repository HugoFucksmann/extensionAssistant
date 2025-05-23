import { EventBus } from '../../features/events/EventBus';
import * as vscode from 'vscode';

export class EventRouter {
    private static instance: EventRouter;
    private eventBus: EventBus;

    private constructor() {
        this.eventBus = EventBus.getInstance();
    }

    public static getInstance(): EventRouter {
        if (!EventRouter.instance) {
            EventRouter.instance = new EventRouter();
        }
        return EventRouter.instance;
    }

    public routeEventToWebview(event: string, payload: any): void {
        try {
            this.eventBus.emit(event, payload);
        } catch (error) {
            console.error('[EventRouter] Error routing event:', error);
        }
    }

    public registerWebviewHandlers(webview: vscode.Webview): void {
        // This will be implemented in Phase 2
        console.log('[EventRouter] Registering webview handlers');
    }

    public unregisterWebviewHandlers(): void {
        // This will be implemented in Phase 2
        console.log('[EventRouter] Unregistering webview handlers');
    }
}
