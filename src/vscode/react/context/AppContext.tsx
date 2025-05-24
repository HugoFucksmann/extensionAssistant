// src/ui/context/AppContext.tsx - Fixed webview context
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { ChatMessage, Chat } from '@shared/types';

// Extend Window interface for VS Code webview
declare global {
  interface Window {
    vscode?: {
      postMessage: (message: any) => void;
    };
  }
}

interface AppState {
  messages: ChatMessage[];
  chatList: Chat[];
  currentChatId: string | null;
  isLoading: boolean;
  showHistory: boolean;
  currentModel: string;
  isDarkMode: boolean;
  processingPhase: string;
}

type AppAction = 
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CHAT_ID'; payload: string | null }
  | { type: 'SET_SHOW_HISTORY'; payload: boolean }
  | { type: 'SET_PROCESSING'; payload: string }
  | { type: 'NEW_CHAT' }
  | { type: 'CLEAR_MESSAGES' };

const initialState: AppState = {
  messages: [],
  chatList: [],
  currentChatId: null,
  isLoading: false,
  showHistory: false,
  currentModel: 'ollama',
  isDarkMode: false,
  processingPhase: '',
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload, isLoading: false };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_CHAT_ID':
      return { ...state, currentChatId: action.payload };
    case 'SET_SHOW_HISTORY':
      return { ...state, showHistory: action.payload };
    case 'SET_PROCESSING':
      return { ...state, processingPhase: action.payload };
    case 'NEW_CHAT':
      return { ...state, messages: [], currentChatId: null, isLoading: false, showHistory: false };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [], isLoading: false };
    default:
      return state;
  }
}

interface AppContextType extends AppState {
  sendMessage: (text: string, files?: string[]) => void;
  newChat: () => void;
  setShowHistory: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Message handler
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      
      switch (type) {
        case 'sessionReady':
          if (payload.chatId) dispatch({ type: 'SET_CHAT_ID', payload: payload.chatId });
          if (payload.messages) dispatch({ type: 'SET_MESSAGES', payload: payload.messages });
          break;
        case 'assistantResponse':
          dispatch({ type: 'ADD_MESSAGE', payload: {
            id: payload.id || `msg_${Date.now()}`,
            content: payload.content || '',
            sender: 'assistant',
            timestamp: payload.timestamp || Date.now(),
          }});
          dispatch({ type: 'SET_LOADING', payload: false });
          break;
        case 'newChatStarted':
          dispatch({ type: 'NEW_CHAT' });
          break;
        case 'processingUpdate':
          dispatch({ type: 'SET_PROCESSING', payload: payload.phase || '' });
          break;
        case 'systemError':
          dispatch({ type: 'ADD_MESSAGE', payload: {
            id: `err_${Date.now()}`,
            content: `Error: ${payload.message}`,
            sender: 'system',
            timestamp: Date.now(),
          }});
          dispatch({ type: 'SET_LOADING', payload: false });
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    window.vscode?.postMessage({ type: 'uiReady' });
    
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const sendMessage = (text: string, files: string[] = []) => {
    // Add user message optimistically
    dispatch({ type: 'ADD_MESSAGE', payload: {
      id: `msg_${Date.now()}`,
      content: text,
      sender: 'user',
      timestamp: Date.now(),
      files,
    }});
    dispatch({ type: 'SET_LOADING', payload: true });
    
    // Send to backend
    window.vscode?.postMessage({
      type: 'userMessageSent',
      payload: { text, files }
    });
  };

  const newChat = () => {
    dispatch({ type: 'NEW_CHAT' });
    window.vscode?.postMessage({ type: 'newChatRequestedByUI' });
  };

  const setShowHistory = (show: boolean) => {
    dispatch({ type: 'SET_SHOW_HISTORY', payload: show });
  };

  return (
    <AppContext.Provider value={{
      ...state,
      sendMessage,
      newChat,
      setShowHistory,
    }}>
      {children}
    </AppContext.Provider>
  );
};