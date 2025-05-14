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
  role?: 'user' | 'assistant' | 'system'; // Optional role property
  timestamp: number;
  files?: string[];
}