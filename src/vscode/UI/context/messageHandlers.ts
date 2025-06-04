// src/vscode/react/context/messageHandlers.ts

import { AppState, AppAction } from './types';
import { DEFAULT_LOADING_TEXT } from './constants';

export type MessageDispatcher = (action: AppAction) => void;
export type MessagePoster = (type: string, payload?: any) => void;

export function createMessageHandler(
    dispatch: MessageDispatcher,
    postMessage: MessagePoster,
    state: AppState
) {
    return (event: MessageEvent) => {
        const { type, payload } = event.data;
        console.log('[WebView EventSource] Received message from extension:', type, payload);

        switch (type) {
            case 'sessionReady':
                dispatch({ type: 'SESSION_READY', payload });
                break;

            case 'assistantResponse':
                // Ensure we don't overwrite content with empty values
                const responsePayload = {
                    id: payload.id || `asst_${Date.now()}`,
                    content: payload.content || '',
                    sender: 'assistant' as const,
                    timestamp: payload.timestamp || Date.now(),
                    metadata: payload.metadata || { status: 'completed' },
                    operationId: payload.operationId,
                };

                // Only add if we have actual content or it's a new message
                if (responsePayload.content || !responsePayload.operationId) {
                    dispatch({ type: 'ADD_MESSAGE', payload: responsePayload });
                }

                dispatch({ type: 'SET_LOADING', payload: { loading: false } });
                dispatch({ type: 'SET_ACTIVE_FEEDBACK_OPERATION_ID', payload: null });
                break;

            case 'newChatStarted':
                dispatch({ type: 'NEW_CHAT_STARTED', payload: { chatId: payload.chatId } });
                break;

            case 'agentActionUpdate':
                dispatch({ type: 'ADD_MESSAGE', payload });
                if (payload.metadata?.status === 'tool_executing') {
                    dispatch({ type: 'SET_ACTIVE_FEEDBACK_OPERATION_ID', payload: payload.operationId || payload.id });
                    dispatch({ type: 'SET_LOADING_TEXT', payload: payload.content || `Ejecutando ${payload.metadata.toolName}...` });
                    dispatch({ type: 'SET_LOADING', payload: { loading: true } });
                } else if (payload.metadata?.status === 'success' || payload.metadata?.status === 'error') {
                    if (state.isLoading) {
                        dispatch({ type: 'SET_LOADING_TEXT', payload: DEFAULT_LOADING_TEXT });
                    }
                }
                break;

            case 'agentPhaseUpdate':
                const phaseContent = payload.content || DEFAULT_LOADING_TEXT;
                const isPhaseStarted = payload.metadata?.status === 'phase_started';
                const isPhaseCompleted = payload.metadata?.status === 'phase_completed';

                if (isPhaseStarted) {
                    dispatch({ type: 'SET_LOADING', payload: { loading: true, text: phaseContent } });
                } else if (isPhaseCompleted) {
                    dispatch({ type: 'SET_LOADING', payload: { loading: false } });
                } else {
                    if (state.isLoading) {
                        dispatch({ type: 'SET_LOADING_TEXT', payload: phaseContent });
                    }
                }
                break;

            case 'systemError':
                dispatch({
                    type: 'ADD_MESSAGE',
                    payload: {
                        id: payload.id || `err_${Date.now()}`,
                        content: payload.content,
                        sender: 'system',
                        timestamp: payload.timestamp || Date.now(),
                        metadata: payload.metadata || { status: 'error' },
                        operationId: payload.operationId,
                    }
                });
                dispatch({ type: 'SET_LOADING', payload: { loading: false } });
                dispatch({ type: 'SET_ACTIVE_FEEDBACK_OPERATION_ID', payload: null });
                break;

            case 'chatHistory':
                dispatch({ type: 'SET_CHAT_LIST', payload: payload.history || [] });
                break;

            case 'chatLoaded':
                dispatch({ type: 'SET_MESSAGES', payload: payload.messages || [] });
                dispatch({ type: 'SET_CHAT_ID', payload: payload.chatId });
                dispatch({ type: 'SET_SHOW_HISTORY', payload: false });
                break;

            case 'modelSwitched':
                dispatch({ type: 'SET_CURRENT_MODEL', payload: payload.modelType });
                break;

            case 'themeChanged':
                const newThemeIsDark = payload.theme === 'dark';
                if (state.isDarkMode !== newThemeIsDark) {
                    dispatch({ type: 'TOGGLE_DARK_MODE' });
                }
                break;

            case 'testModeChanged':
                dispatch({ type: 'SET_TEST_MODE', payload: payload.enabled });
                break;

            case 'showHistory':
                dispatch({ type: 'SET_SHOW_HISTORY', payload: true });
                if (state.chatList.length === 0) {
                    postMessage('command', { command: 'getChatHistory' });
                }
                break;
        }
    };
}