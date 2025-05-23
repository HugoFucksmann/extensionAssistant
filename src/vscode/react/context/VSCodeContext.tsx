// src/ui/context/VSCodeContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { ThemeType, getTheme } from '../theme/theme';
import { ChatMessage, ProcessingStatus, ToolExecution, Chat } from '@shared/types';
import { MessageService } from './MessageService';
import { MessageHandler } from './MessageHandler';
import { 
  ChatStateType, 
  ChatAction, 
  chatReducer, 
  initialChatState 
} from './state/ChatStateManager';
import { 
  ProcessingAction, 
  processingReducer, 
  initialProcessingState 
} from './state/ProcessingStateManager';

interface VSCodeContextType {
  // Chat state
  messages: ChatMessage[];
  chatList: Chat[];
  currentChatId: string | null;
  isLoading: boolean;
  showHistory: boolean;
  
  // UI state
  currentModel: string;
  theme: ThemeType;
  isDarkMode: boolean;
  processingStatus: ProcessingStatus;
  
  // Actions
  postMessage: (type: string, payload?: Record<string, unknown>) => void;
  loadChat: (chatId: string) => void;
  newChat: () => void;
  setShowHistory: (show: boolean) => void;
  toggleTheme: () => void;
  executeToolManually: (toolName: string, parameters: Record<string, any>) => void;
  cancelToolExecution: (toolName: string) => void;
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
  // State management with reducers
  const [chatState, dispatchChat] = useReducer(chatReducer, initialChatState);
  const [processingStatus, dispatchProcessing] = useReducer(processingReducer, initialProcessingState);
  
  // Simple state
  const [currentModel, setCurrentModel] = useState('ollama');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Services
  const messageService = useMemo(() => MessageService.getInstance(), []);
  const theme = useMemo(() => getTheme(isDarkMode), [isDarkMode]);
  
  // Message handler with callbacks
  const messageHandler = useMemo(() => new MessageHandler({
    dispatchChat,
    dispatchProcessing,
    setCurrentModel,
    setIsDarkMode,
  }), []);

  // Public API methods
  const postMessage = (type: string, payload: Record<string, unknown> = {}) => {
    if (type === 'userMessage') {
      const userMsgPayload = payload as { text: string, files?: string[] };
      
      // Add user message optimistically
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        content: userMsgPayload.text || '',
        sender: 'user',
        timestamp: Date.now(),
        files: userMsgPayload.files?.map(f => (typeof f === 'string' ? f : (f as any).path)) || []
      };
      
      dispatchChat({ type: 'ADD_MESSAGE', payload: userMessage });
      dispatchChat({ type: 'SET_LOADING', payload: true });
    }
    
    messageService.postMessage(type, payload);
  };

  const loadChat = (chatId: string) => {
    messageService.postMessage('command', { 
      command: 'loadChat', 
      payload: { chatId } 
    });
    dispatchChat({ type: 'SET_SHOW_HISTORY', payload: false });
  };

  const newChat = () => {
    console.log('Starting new chat...');
    dispatchChat({ type: 'NEW_CHAT' });
    
    window.vscode.postMessage({
      type: 'newChatRequestedByUI'
    });
    
    // Auto-scroll to top
    setTimeout(() => {
      const chatContainer = document.getElementById('chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = 0;
      }
    }, 100);
  };

  const setShowHistory = (show: boolean) => {
    dispatchChat({ type: 'SET_SHOW_HISTORY', payload: show });
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  const executeToolManually = (toolName: string, parameters: Record<string, any>) => {
    messageService.postMessage('command', {
      command: 'executeTool',
      payload: { tool: toolName, parameters }
    });
  };
  
  const cancelToolExecution = (toolName: string) => {
    messageService.postMessage('command', {
      command: 'cancelToolExecution',
      payload: { tool: toolName }
    });
  };

  // Initialize and setup message listener
  useEffect(() => {
    // Request initial state
    window.vscode.postMessage({ type: 'uiReady' });
    
    // Setup message listener
    window.addEventListener('message', messageHandler.handleMessage);
    return () => window.removeEventListener('message', messageHandler.handleMessage);
  }, [messageHandler]);

  const contextValue: VSCodeContextType = {
    // Chat state
    messages: chatState.messages,
    chatList: chatState.chatList,
    currentChatId: chatState.currentChatId,
    isLoading: chatState.isLoading,
    showHistory: chatState.showHistory,
    
    // UI state
    currentModel,
    theme,
    isDarkMode,
    processingStatus,
    
    // Actions
    postMessage,
    loadChat,
    newChat,
    setShowHistory,
    toggleTheme,
    executeToolManually,
    cancelToolExecution,
  };

  return (
    <VSCodeContext.Provider value={contextValue}>
      {children}
    </VSCodeContext.Provider>
  );
};