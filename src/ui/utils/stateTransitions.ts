import { ChatMessage, ToolExecution } from "../types/WebviewTypes";
import { ChatState } from "../hooks/useChatState";

export const validateChatState = (state: ChatState): boolean => {
    if (!state.currentChatId && state.messages.length > 0) {
        console.warn('Invalid state: Messages exist without current chat ID');
        return false;
    }
    return true;
};

export const handleProcessingError = (
    error: string,
    state: ChatState,
    setError: (error: string | null) => void,
    updateProcessing: (phase: string, status: 'inactive' | 'active' | 'error', tools: ToolExecution[]) => void
) => {
    setError(error);
    updateProcessing('error', 'error', []);
};

export const createChatMessage = (
    content: string,
    sender: 'user' | 'assistant' | 'system',
    metadata?: Record<string, any>
): ChatMessage => ({
    id: Date.now().toString(),
    content,
    sender,
    timestamp: Date.now(),
    metadata: metadata || {}
});

export const updateChatMessage = (
    message: ChatMessage,
    updates: Partial<ChatMessage>
): ChatMessage => ({
    ...message,
    ...updates
});

export const isProcessingComplete = (state: ChatState): boolean => {
    return state.processing.status !== 'active';
};

export const getActiveTools = (state: ChatState): ToolExecution[] => {
    return state.processing.tools.filter((tool: ToolExecution) => tool.status === 'started');
};
