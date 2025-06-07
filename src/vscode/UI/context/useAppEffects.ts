// src/vscode/react/context/useAppEffects.ts

import { useEffect } from 'react';
import { AppState } from './types';
import { createMessageHandler, MessageDispatcher, MessagePoster } from './messageHandlers';

export function useAppEffects(
    state: AppState,
    dispatch: MessageDispatcher,
    postMessage: MessagePoster
) {
    useEffect(() => {
        const win = window as any;
        const doc = document as any;
        const body = doc.body as any;

        console.log('[useAppEffects] Setting up message handler');
        const handleMessage = createMessageHandler(dispatch, postMessage, state);

        const wrappedHandler = (event: MessageEvent) => {
            console.log('[useAppEffects] Received message from extension:', event.data.type);
            handleMessage(event);
        };

        win.addEventListener('message', wrappedHandler);
        console.log('[useAppEffects] Message handler registered, sending uiReady');
        postMessage('uiReady');

        const observer = new MutationObserver(() => {
            const isDark = body.classList.contains('vscode-dark');
            if (state.isDarkMode !== isDark) {
                dispatch({ type: 'TOGGLE_DARK_MODE' });
            }
        });
        observer.observe(body, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => {
            win.removeEventListener('message', wrappedHandler);
            observer.disconnect();
        };
    }, [state.isDarkMode, state.chatList.length]);
}