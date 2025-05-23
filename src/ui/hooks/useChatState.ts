import { useState, useCallback, useEffect } from 'react';
import { useWebviewMessaging } from './useWebviewMessaging';
import { WebviewMessage } from '../types/WebviewTypes';

import { ToolExecution } from '../types/WebviewTypes';

export type ChatState = {
    messages: WebviewMessage[];
    chatList: WebviewMessage[];
    currentChatId: string | null;
    isLoading: boolean;
    showHistory: boolean;
    processing: {
        phase: string;
        status: 'inactive' | 'active' | 'error';
        tools: ToolExecution[];
    };
    error: string | null;
};

export const initialState: ChatState = {
    messages: [],
    chatList: [],
    currentChatId: null,
    isLoading: false,
    showHistory: false,
    processing: {
        phase: '',
        status: 'inactive',
        tools: [] as ToolExecution[]
    },
    error: null
};

export function useChatState() {
    const [state, setState] = useState<ChatState>(initialState);
    const { sendMessage } = useWebviewMessaging();

    const setActiveChat = useCallback(async (chatId: string, messages: WebviewMessage[]) => {
        setState(prev => ({
            ...prev,
            currentChatId: chatId,
            messages,
            isLoading: false,
            showHistory: false
        }));
    }, []);

    const addMessage = useCallback((message: WebviewMessage) => {
        setState(prev => ({
            ...prev,
            messages: [...prev.messages, message]
        }));
    }, []);

    const clearMessages = useCallback(() => {
        setState(prev => ({
            ...prev,
            messages: [],
            isLoading: false
        }));
    }, []);

    const updateProcessing = useCallback((phase: string, status: 'inactive' | 'active' | 'error', tools: ToolExecution[]) => {
        setState(prev => ({
            ...prev,
            processing: {
                phase,
                status,
                tools
            }
        }));
    }, []);

    const setError = useCallback((error: string | null) => {
        setState(prev => ({
            ...prev,
            error
        }));
    }, []);

    // Handle messages from the extension
    useEffect(() => {
        const handleMessage = async (message: WebviewMessage) => {
            switch (message.type) {
                case 'extension:sessionReady':
                    await setActiveChat(message.payload.chatId, message.payload.messages);
                    break;
                case 'extension:newChatStarted':
                    await setActiveChat(message.payload.chatId, []);
                    break;
                case 'extension:chatLoaded':
                    await setActiveChat(message.payload.chatId, message.payload.messages);
                    break;
                case 'extension:chatCleared':
                    clearMessages();
                    break;
                case 'extension:processingUpdate':
                    updateProcessing(
                        message.payload.phase,
                        message.payload.status,
                        message.payload.tools || []
                    );
                    break;
                case 'extension:systemError':
                    setError(message.payload.message);
                    break;
            }
        };

        return () => {
            // Cleanup message handler
        };
    }, [setActiveChat, clearMessages, updateProcessing, setError]);

    return {
        state,
        setActiveChat,
        addMessage,
        clearMessages,
        updateProcessing,
        setError
    };
}
