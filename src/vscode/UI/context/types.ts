// src/vscode/react/context/types.ts - Enhanced with Execution Mode Support

import { ChatMessage, Chat } from '../../../features/chat/types';

export type ThemeType = any;

export interface ExecutionMode {
    id: 'simple' | 'planner' | 'supervised';
    name: string;
    description: string;
    enabled: boolean;
}

export interface AppState {
    messages: ChatMessage[];
    chatList: Chat[];
    currentChatId: string | null;
    isLoading: boolean;
    showHistory: boolean;
    currentModel: string;
    isDarkMode: boolean;
    theme: ThemeType;
    testModeEnabled: boolean;
    activeFeedbackOperationId: string | null;
    loadingText: string;
    // New execution mode properties
    currentExecutionMode: 'simple' | 'planner' | 'supervised';
    availableExecutionModes: ExecutionMode[];
}

export type AppAction =
    | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
    | { type: 'ADD_MESSAGE'; payload: ChatMessage }
    | { type: 'UPDATE_MESSAGE'; payload: { id: string; operationId?: string;[key: string]: any } }
    | { type: 'SET_LOADING'; payload: { loading: boolean; text?: string } }
    | { type: 'SET_CHAT_ID'; payload: string | null }
    | { type: 'SET_SHOW_HISTORY'; payload: boolean }
    | { type: 'NEW_CHAT_STARTED'; payload: { chatId: string } }
    | { type: 'CLEAR_MESSAGES' }
    | { type: 'SET_CHAT_LIST'; payload: Chat[] }
    | { type: 'SET_CURRENT_MODEL'; payload: string }
    | { type: 'TOGGLE_DARK_MODE' }
    | { type: 'SET_THEME'; payload: ThemeType }
    | { type: 'SET_TEST_MODE'; payload: boolean }
    | { type: 'SESSION_READY'; payload: { chatId: string; messages: ChatMessage[]; model?: string; history?: Chat[]; testMode?: boolean; availableModes?: ExecutionMode[]; currentMode?: 'simple' | 'planner' | 'supervised' } }
    | { type: 'SET_LOADING_TEXT'; payload: string }
    | { type: 'SET_ACTIVE_FEEDBACK_OPERATION_ID'; payload: string | null }
    // New execution mode actions
    | { type: 'SET_EXECUTION_MODE'; payload: 'simple' | 'planner' | 'supervised' }
    | { type: 'SET_AVAILABLE_EXECUTION_MODES'; payload: ExecutionMode[] }
    | { type: 'EXECUTION_MODE_CHANGED'; payload: { mode: 'simple' | 'planner' | 'supervised'; modeName: string } };

export interface AppContextType extends AppState {
    postMessage: (type: string, payload?: any) => void;
    sendMessage: (text: string, files?: string[]) => void;
    newChat: () => void;
    setShowHistory: (show: boolean) => void;
    loadChat: (chatId: string) => void;
    switchModel: (modelType: string) => void;
    toggleDarkMode: () => void;
    // New execution mode method
    switchExecutionMode: (mode: 'simple' | 'planner' | 'supervised') => void;
}