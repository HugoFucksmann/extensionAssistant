// src/ui/types/WebviewTypes.ts
export interface WebviewMessage {
    type: string;
    payload: any;
}

export interface WebviewResponse {
    type: string;
    data?: any;
    error?: string;
}

export interface ChatMessage {
    id: string;
    content: string;
    sender: 'user' | 'assistant' | 'system';
    timestamp: number;
    metadata?: Record<string, any>;
}

export interface Chat {
    id: string;
    messages: ChatMessage[];
    createdAt: number;
    updatedAt: number;
}

export interface SessionState {
    activeChatId: string | null;
    chats: Chat[];
    isDarkMode: boolean;
    currentModel: string;
}

export interface FileState {
    currentFile: string | null;
    fileContents: string | null;
    projectFiles: string[];
}

export interface ToolExecution {
    id: string;
    name: string;
    status: 'started' | 'completed' | 'failed';
    [key: string]: any;
}

export interface WebviewState {
    session: SessionState;
    files: FileState;
    processing: {
        isProcessing: boolean;
        currentStep: string | null;
    };
}
