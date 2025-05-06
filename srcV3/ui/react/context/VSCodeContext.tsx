import React, { createContext, useState, useEffect, useContext } from 'react';

type MessageType = 'chat' | 'command' | 'system';

interface ChatMessage {
  text: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: number;
  files?: string[];
}

interface VSCodeContextType {
  messages: ChatMessage[];
  currentModel: string;
  isLoading: boolean;
  postMessage: (type: MessageType, payload?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    vscode: {
      postMessage: (message: unknown) => void;
    };
  }
}

const VSCodeContext = createContext<VSCodeContextType | undefined>(undefined);

export const useVSCodeContext = () => {
  const context = useContext(VSCodeContext);
  if (!context) {
    throw new Error('useVSCodeContext must be used within a VSCodeProvider');
  }
  return context;
};

export const VSCodeProvider = ({ children }: { children: React.ReactNode }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentModel, setCurrentModel] = useState('ollama');
  const [isLoading, setLoading] = useState(false);

  const postMessage = (type: MessageType, payload: Record<string, unknown> = {}) => {
    if (type === 'chat') {
      setMessages(prev => [...prev, {
        text: payload.text as string || '',
        sender: 'user',
        timestamp: Date.now(),
        files: payload.files as string[] | undefined
      }]);
      setLoading(true);
    }
    window.vscode.postMessage({ type, ...payload });
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent<{ type: MessageType } & Record<string, unknown>>) => {
      const { type, ...payload } = event.data;
      
      switch (type) {
        case 'chat':
          setMessages(prev => [...prev, {
            text: payload.text as string || '',
            sender: 'assistant',
            timestamp: Date.now()
          }]);
          setLoading(false);
          break;
          
        case 'command':
          if (payload.command === 'setModel') {
            setCurrentModel(payload.data as string);
          }
          break;
          
        case 'system':
          if (payload.error) {
            setMessages(prev => [...prev, {
              text: `Error: ${payload.error as string}`,
              sender: 'system',
              timestamp: Date.now()
            }]);
            setLoading(false);
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <VSCodeContext.Provider value={{ messages, currentModel, isLoading, postMessage }}>
      {children}
    </VSCodeContext.Provider>
  );
};