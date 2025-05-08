export interface Chat {
    id: string;
    title: string;
    timestamp: number;
    preview?: string;
}

export interface ChatMessage {
    id?: string;
    chatId: string;
    content: string;
    sender: 'user' | 'assistant' | 'system';
    timestamp: number;
}