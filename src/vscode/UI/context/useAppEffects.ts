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

        const handleMessage = createMessageHandler(dispatch, postMessage, state);

        win.addEventListener('message', handleMessage);
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
            win.removeEventListener('message', handleMessage);
            observer.disconnect();
        };
    }, [state.isDarkMode, state.chatList.length]);
}