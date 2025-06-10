// src/vscode/react/context/appActions.ts - Enhanced with Execution Mode Support

import { ChatMessage } from '../../../features/chat/types';
import { DEFAULT_LOADING_TEXT } from './constants';

export type MessagePoster = (type: string, payload?: any) => void;
export type ActionDispatcher = (action: any) => void;

export function createAppActions(
    postMessage: MessagePoster,
    dispatch: ActionDispatcher
) {
    return {
        sendMessage: (text: string, files: string[] = [], mode?: 'simple' | 'planner' | 'supervised') => {
            const userMessage: ChatMessage = {
                id: `user_${Date.now()}`,
                content: text,
                sender: 'user',
                timestamp: Date.now(),
                files: files,
            };

            console.log('[AppActions] Sending user message:', userMessage);
            dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
            dispatch({ type: 'SET_LOADING', payload: { loading: true, text: DEFAULT_LOADING_TEXT } });

            // Include execution mode in the message if specified
            postMessage('userMessageSent', {
                text,
                files,
                ...(mode && { mode })
            });
        },

        newChat: () => {
            postMessage('newChatRequestedByUI');
        },

        setShowHistory: (show: boolean, chatListLength: number) => {
            dispatch({ type: 'SET_SHOW_HISTORY', payload: show });
            if (show && chatListLength === 0) {
                postMessage('command', { command: 'getChatHistory' });
            }
        },

        loadChat: (chatId: string) => {
            postMessage('command', { command: 'loadChat', chatId });
        },

        switchModel: (modelType: string) => {
            postMessage('command', { command: 'switchModel', modelType });
        },

        toggleDarkMode: () => {
            dispatch({ type: 'TOGGLE_DARK_MODE' });
        }
    };
}