export interface Chat {
    id: string;
    title: string;
    timestamp: number;
    preview?: string;
}

export interface ChatMessage {
  id?: string; // Hacer opcional para creación
  chatId: string;
  content: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: number;
  files?: string[];
}