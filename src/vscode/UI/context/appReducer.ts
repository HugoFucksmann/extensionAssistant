// src/vscode/react/context/appReducer.ts - Enhanced with Execution Mode Support

import { AppState, AppAction } from './types';
import { DEFAULT_LOADING_TEXT } from './constants';

export function appReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case 'SESSION_READY':
            return {
                ...state,
                messages: action.payload.messages || [],
                currentChatId: action.payload.chatId,
                currentModel: action.payload.model || state.currentModel,
                chatList: action.payload.history || state.chatList,
                isLoading: false,
                testModeEnabled: action.payload.testMode !== undefined ? action.payload.testMode : state.testModeEnabled,
                loadingText: DEFAULT_LOADING_TEXT,
                activeFeedbackOperationId: null,
                // Update execution mode state from session
                availableExecutionModes: action.payload.availableModes || state.availableExecutionModes,
                currentExecutionMode: action.payload.currentMode || state.currentExecutionMode,
            };

        case 'SET_MESSAGES':
            return {
                ...state,
                messages: action.payload,
                isLoading: false,
                loadingText: DEFAULT_LOADING_TEXT,
                activeFeedbackOperationId: null
            };

        case 'SET_LOADING':
            return {
                ...state,
                isLoading: action.payload.loading,
                loadingText: action.payload.loading ? (action.payload.text || state.loadingText) : DEFAULT_LOADING_TEXT,
            };

        case 'SET_LOADING_TEXT':
            return { ...state, loadingText: action.payload };

        case 'SET_ACTIVE_FEEDBACK_OPERATION_ID':
            return { ...state, activeFeedbackOperationId: action.payload };

        case 'SET_CHAT_ID':
            return { ...state, currentChatId: action.payload };

        case 'SET_SHOW_HISTORY':
            return { ...state, showHistory: action.payload };

        case 'NEW_CHAT_STARTED':
            return {
                ...state,
                messages: [],
                currentChatId: action.payload.chatId,
                isLoading: false,
                showHistory: false,
                loadingText: DEFAULT_LOADING_TEXT,
                activeFeedbackOperationId: null,
            };

        case 'CLEAR_MESSAGES':
            return {
                ...state,
                messages: [],
                isLoading: false,
                loadingText: DEFAULT_LOADING_TEXT,
                activeFeedbackOperationId: null
            };

        case 'SET_CHAT_LIST':
            return { ...state, chatList: action.payload };

        case 'SET_CURRENT_MODEL':
            return { ...state, currentModel: action.payload };

        case 'TOGGLE_DARK_MODE': {
            const newIsDarkMode = !state.isDarkMode;
            return {
                ...state,
                isDarkMode: newIsDarkMode,
                theme: require('../theme/theme.js').getTheme(newIsDarkMode)
            };
        }

        case 'SET_THEME':
            return { ...state, theme: action.payload };

        case 'SET_TEST_MODE':
            return { ...state, testModeEnabled: action.payload };

        // New execution mode cases
        case 'SET_EXECUTION_MODE':
            return { ...state, currentExecutionMode: action.payload };

        case 'SET_AVAILABLE_EXECUTION_MODES':
            return { ...state, availableExecutionModes: action.payload };

        case 'EXECUTION_MODE_CHANGED':
            return {
                ...state,
                currentExecutionMode: action.payload.mode
            };

        case 'ADD_MESSAGE': {
            const msg = action.payload;

            // Only check for duplicates if message has operationId (not for regular user/assistant messages)
            if (msg.operationId) {
                const existingIndex = state.messages.findIndex(m => m.operationId === msg.operationId);

                if (existingIndex !== -1) {
                    // Update existing message, preserving content if new message is empty
                    const updatedMessages = [...state.messages];
                    const existingMsg = updatedMessages[existingIndex];

                    updatedMessages[existingIndex] = {
                        ...existingMsg,
                        ...msg,
                        id: existingMsg.id, // Keep original ID
                        content: msg.content || existingMsg.content, // Preserve content if empty
                        metadata: {
                            ...existingMsg.metadata,
                            ...msg.metadata,
                        },
                    };
                    return { ...state, messages: updatedMessages };
                }
            }

            // Add new message (default case)
            return { ...state, messages: [...state.messages, msg] };
        }

        case 'UPDATE_MESSAGE': {
            const { id, operationId, ...rest } = action.payload;
            const msgIdToUpdate = operationId || id;
            const idx = state.messages.findIndex(msg => (msg.operationId || msg.id) === msgIdToUpdate);

            if (idx === -1) {
                console.warn(`[AppReducer] UPDATE_MESSAGE: Message with id/operationId ${msgIdToUpdate} not found for update.`);
                return state;
            }

            const updatedMessages = [...state.messages];
            updatedMessages[idx] = {
                ...updatedMessages[idx],
                ...rest,
                timestamp: rest.timestamp || updatedMessages[idx].timestamp,
                metadata: {
                    ...updatedMessages[idx].metadata,
                    ...rest.metadata,
                }
            };
            return { ...state, messages: updatedMessages };
        }

        default:
            return state;
    }
}