// src/ui/context/VSCodeContext.tsx
import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';

import { ThemeType } from '../theme/theme';
import { getTheme } from '../theme/theme';
import { Chat, ChatMessage } from '../../../store';

interface VSCodeContextType {
  messages: ChatMessage[];
  chatList: Chat[];
  currentModel: string;
  isLoading: boolean;
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  postMessage: (type: string, payload?: Record<string, unknown>) => void;
  loadChat: (chatId: string) => void;
  theme: ThemeType;
  isDarkMode: boolean;
  toggleTheme: () => void;
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
  const [messages, setMessages] = useState<ChatMessage[]>(() => []);
  const [chatList, setChatList] = useState<Chat[]>([]);
  const [currentModel, setCurrentModel] = useState('ollama');
  const [isLoading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const theme = useMemo(() => getTheme(isDarkMode), [isDarkMode]);

  const postMessage = (type: string, payload: Record<string, unknown> = {}) => {
    if (type === 'chat') {
      // Add user message to UI immediately for better UX
      const userMessage: ChatMessage = {
        chatId: payload.chatId as string || '',
        content: payload.text as string || '',
        sender: 'user',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, userMessage]);
      setLoading(true);
    }
    window.vscode.postMessage({ type, ...payload });
  };

  const loadChat = (chatId: string) => {
    postMessage('command', { 
      command: 'loadChat', 
      chatId 
    });
    setShowHistory(false);
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    window.vscode.postMessage({ type: 'setThemePreference', isDarkMode: newMode });
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent<any>) => {
      const { type, payload } = event.data;
      
      switch (type) {
        case 'chatResponse':
          setMessages(prev => [...prev, {
            chatId: payload.chatId,
            content: payload.text,
            sender: 'assistant',
            timestamp: Date.now()
          }]);
          setLoading(false);
          break;
          
        case 'modelChanged':
          setCurrentModel(payload.modelType);
          break;
          
        case 'chatListUpdated':
          setChatList(payload.chats);
          break;
          
        case 'chatLoaded':
          setMessages(payload.messages);
          break;
          
        case 'historyRequested':
          setShowHistory(true);
          break;

        case 'newChat':
          setMessages([]);
          break;
          
        case 'error':
          setMessages(prev => [...prev, {
            chatId: '',
            content: `Error: ${payload.message}`,
            sender: 'system',
            timestamp: Date.now()
          }]);
          setLoading(false);
          break;

        case 'themeChanged':
          setIsDarkMode(payload.isDarkMode);
          break;
      }
    };

    // Request chat list on initial load
    window.vscode.postMessage({ 
      type: 'command', 
      command: 'getChatList' 
    });

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <VSCodeContext.Provider value={{ 
      messages, 
      chatList, 
      currentModel, 
      isLoading, 
      showHistory, 
      setShowHistory, 
      postMessage, 
      loadChat,
      theme,
      isDarkMode,
      toggleTheme
    }}>
      {children}
    </VSCodeContext.Provider>
  );
};