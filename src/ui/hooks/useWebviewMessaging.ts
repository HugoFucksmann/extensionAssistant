import { useEffect, useCallback } from 'react';
import { WebviewMessage } from '../types/WebviewTypes';

export function useWebviewMessaging() {
    const sendMessage = useCallback((message: WebviewMessage) => {
        const vscode = (window as any).acquireVsCodeApi();
        vscode.postMessage(message);
    }, []);

    const handleMessage = useCallback((event: MessageEvent) => {
        const message = event.data as WebviewMessage;
        // This will be implemented in Phase 2
        console.log('[WebviewMessaging] Received message:', message);
    }, []);

    useEffect(() => {
        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [handleMessage]);

    return {
        sendMessage,
        handleMessage,
    };
}
