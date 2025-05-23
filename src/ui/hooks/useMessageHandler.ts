import { useCallback } from 'react';
import { useChatState } from './useChatState';
import { useWebviewMessaging } from './useWebviewMessaging';

export function useMessageHandler() {
    const { sendMessage } = useWebviewMessaging();
    const { state, setActiveChat, addMessage, clearMessages, updateProcessing, setError } = useChatState();

    const handleUserMessage = useCallback(
        async (text: string, files: string[] = []) => {
            if (!state.currentChatId) {
                setError('No active chat session');
                return;
            }

            if (!text.trim() && files.length === 0) {
                setError('Message cannot be empty');
                return;
            }

            try {
                updateProcessing('processing_message', 'active', []);
                await sendMessage({
                    type: 'webview:sendMessage',
                    payload: {
                        text,
                        files,
                        chatId: state.currentChatId
                    }
                });
            } catch (error: any) {
                setError(error.message || 'Failed to send message');
            }
        },
        [state.currentChatId, sendMessage, updateProcessing, setError]
    );

    const handleNewChat = useCallback(async () => {
        try {
            await sendMessage({
                type: 'webview:requestNewChat',
                payload: {}
            });
        } catch (error: any) {
            setError(error.message || 'Failed to create new chat');
        }
    }, [sendMessage, setError]);

    const handleLoadChat = useCallback(
        async (chatId: string) => {
            try {
                await sendMessage({
                    type: 'webview:loadChat',
                    payload: { chatId }
                });
            } catch (error: any) {
                setError(error.message || 'Failed to load chat');
            }
        },
        [sendMessage, setError]
    );

    const handleClearChat = useCallback(async () => {
        try {
            await sendMessage({
                type: 'webview:clearChat',
                payload: { chatId: state.currentChatId }
            });
        } catch (error: any) {
            setError(error.message || 'Failed to clear chat');
        }
    }, [state.currentChatId, sendMessage, setError]);

    return {
        state,
        handleUserMessage,
        handleNewChat,
        handleLoadChat,
        handleClearChat
    };
}
