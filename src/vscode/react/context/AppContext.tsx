// src/vscode/react/context/AppContext.tsx

import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { ChatMessage, Chat } from '@shared/types'; // Assuming Chat is for chatList
import { getTheme, ThemeType } from '../theme/theme'; // Assuming you have a theme file

declare global {
  interface Window {
    vscode?: {
      postMessage: (message: any) => void;
      getState: () => any; // If you persist state in VS Code
      setState: (state: any) => void; // If you persist state in VS Code
    };
  }
}

interface AppState {
  messages: ChatMessage[];
  chatList: Chat[]; // Added
  currentChatId: string | null;
  isLoading: boolean;
  showHistory: boolean;
  currentModel: string; // Added (already there but ensure it's used)
  isDarkMode: boolean; // Added (already there but ensure it's used)
  theme: ThemeType; // Added
  processingPhase: string; // Added (already there)
  // Potentially other states your components need
}

type AppAction =
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CHAT_ID'; payload: string | null }
  | { type: 'SET_SHOW_HISTORY'; payload: boolean }
  | { type: 'SET_PROCESSING_PHASE'; payload: string } // Renamed for clarity
  | { type: 'NEW_CHAT_STARTED'; payload: { chatId: string } } // Updated for clarity
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_CHAT_LIST'; payload: Chat[] } // Added
  | { type: 'SET_CURRENT_MODEL'; payload: string } // Added
  | { type: 'TOGGLE_DARK_MODE' } // Added
  | { type: 'SET_THEME'; payload: ThemeType } // Added
  | { type: 'SESSION_READY'; payload: { chatId: string; messages: ChatMessage[]; model?: string; history?: Chat[] }}; // Consolidated

// Try to get initial dark mode from VS Code body class
const body = document.body;
const initialIsDarkMode = body.classList.contains('vscode-dark');


const initialState: AppState = {
  messages: [],
  chatList: [],
  currentChatId: null,
  isLoading: false,
  showHistory: false,
  currentModel: 'gemini', // Default model
  isDarkMode: initialIsDarkMode,
  theme: getTheme(initialIsDarkMode),
  processingPhase: '',
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SESSION_READY':
      return {
        ...state,
        messages: action.payload.messages || [],
        currentChatId: action.payload.chatId,
        currentModel: action.payload.model || state.currentModel,
        chatList: action.payload.history || state.chatList,
        isLoading: false,
      };
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
    case 'SET_PROCESSING_PHASE':
      return { ...state, processingPhase: action.payload };
    case 'NEW_CHAT_STARTED': // Handles new chat from UI or backend
      return { 
        ...state, 
        messages: [], 
        currentChatId: action.payload.chatId, 
        isLoading: false, 
        showHistory: false 
      };
    case 'CLEAR_MESSAGES': // Might be redundant if NEW_CHAT_STARTED covers it
      return { ...state, messages: [], isLoading: false };
    case 'SET_CHAT_LIST':
      return { ...state, chatList: action.payload };
    case 'SET_CURRENT_MODEL':
      return { ...state, currentModel: action.payload };
    case 'TOGGLE_DARK_MODE':
      const newIsDarkMode = !state.isDarkMode;
      return { ...state, isDarkMode: newIsDarkMode, theme: getTheme(newIsDarkMode) };
    case 'SET_THEME': // If theme is set externally
        return { ...state, theme: action.payload };
    default:
      return state;
  }
}

interface AppContextType extends AppState {
  postMessage: (type: string, payload?: any) => void; // Generic postMessage
  sendMessage: (text: string, files?: string[]) => void;
  newChat: () => void;
  setShowHistory: (show: boolean) => void;
  loadChat: (chatId: string) => void; // Added
  switchModel: (modelType: string) => void; // Added
  toggleDarkMode: () => void; // Added
  // Add other actions your components might need
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const postMessageToBackend = (type: string, payload?: any) => {
    window.vscode?.postMessage({ type, payload });
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      console.log('[AppContext] Received from backend:', type, payload);

      switch (type) {
        case 'sessionReady': // From WebviewProvider on init
          dispatch({ type: 'SESSION_READY', payload });
          break;
        case 'assistantResponse':
          dispatch({
            type: 'ADD_MESSAGE', payload: {
              id: payload.id || `asst_${Date.now()}`,
              content: payload.content || '',
              sender: 'assistant',
              timestamp: payload.timestamp || Date.now(),
              metadata: payload.metadata, // Pass metadata for tool executions
            }
          });
          dispatch({ type: 'SET_LOADING', payload: false });
          break;
        case 'newChatStarted': // When backend confirms new chat
          dispatch({ type: 'NEW_CHAT_STARTED', payload: { chatId: payload.chatId } });
          break;
        case 'processingUpdate': // For ReAct style updates
          dispatch({ type: 'SET_PROCESSING_PHASE', payload: payload.phase || '' });
          if (payload.phase === 'thinking' || payload.phase === 'processing') {
            dispatch({ type: 'SET_LOADING', payload: true });
          } else {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
          break;
        case 'systemError':
          dispatch({
            type: 'ADD_MESSAGE', payload: {
              id: `err_${Date.now()}`,
              content: `Error: ${payload.message}`,
              sender: 'system',
              timestamp: Date.now(),
            }
          });
          dispatch({ type: 'SET_LOADING', payload: false });
          break;
        case 'chatHistory': // For loading chat history
            dispatch({ type: 'SET_CHAT_LIST', payload: payload.history || [] });
            break;
        case 'chatLoaded': // When a specific chat is loaded
            dispatch({ type: 'SET_MESSAGES', payload: payload.messages || [] });
            dispatch({ type: 'SET_CHAT_ID', payload: payload.chatId });
            dispatch({ type: 'SET_SHOW_HISTORY', payload: false }); // Close history view
            break;
        case 'modelSwitched':
            dispatch({ type: 'SET_CURRENT_MODEL', payload: payload.modelType });
            break;
        case 'themeChanged': // If VS Code theme changes
            const newThemeIsDark = payload.theme === 'dark';
            if (state.isDarkMode !== newThemeIsDark) {
                dispatch({ type: 'TOGGLE_DARK_MODE' });
            }
            break;
        case 'showHistory': // Manejar la solicitud de mostrar el historial
            dispatch({ type: 'SET_SHOW_HISTORY', payload: true });
            // Opcional: Cargar el historial si no está cargado
            if (state.chatList.length === 0) {
                postMessageToBackend('command', { command: 'getChatHistory' });
            }
            break;
        // Add more cases as needed
      }
    };

    window.addEventListener('message', handleMessage);
    postMessageToBackend('uiReady'); // Inform backend UI is ready

    // Listen for VS Code theme changes
    const observer = new MutationObserver(() => {
        const currentIsDark = document.body.classList.contains('vscode-dark');
        if (state.isDarkMode !== currentIsDark) {
            dispatch({ type: 'TOGGLE_DARK_MODE' });
        }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
        window.removeEventListener('message', handleMessage);
        observer.disconnect();
    };
  }, [state.isDarkMode]); // Add state.isDarkMode to dependencies

  const sendMessage = (text: string, files: string[] = []) => {
    dispatch({
      type: 'ADD_MESSAGE', payload: {
        id: `user_${Date.now()}`,
        content: text,
        sender: 'user',
        timestamp: Date.now(),
        files: files, // Ensure files are in expected format
      }
    });
    dispatch({ type: 'SET_LOADING', payload: true });
    postMessageToBackend('userMessageSent', { text, files });
  };

  const newChat = () => {
    // Optimistically update UI, backend will confirm with 'newChatStarted'
    // The backend should generate the new chatId
    postMessageToBackend('newChatRequestedByUI');
  };

  const setShowHistory = (show: boolean) => {
    dispatch({ type: 'SET_SHOW_HISTORY', payload: show });
    if (show) {
        postMessageToBackend('command', { command: 'getChatHistory' }); // Request history when opening
    }
  };

  const loadChat = (chatId: string) => {
    postMessageToBackend('command', { command: 'loadChat', chatId });
  };

  const switchModel = (modelType: string) => {
    postMessageToBackend('command', { command: 'switchModel', modelType });
    // Optimistically: dispatch({ type: 'SET_CURRENT_MODEL', payload: modelType });
    // Or wait for 'modelSwitched' from backend
  };

  const toggleDarkMode = () => {
      dispatch({ type: 'TOGGLE_DARK_MODE' });
  }

  return (
    <AppContext.Provider value={{
      ...state,
      postMessage: postMessageToBackend,
      sendMessage,
      newChat,
      setShowHistory,
      loadChat,
      switchModel,
      toggleDarkMode,
    }}>
      {children}
    </AppContext.Provider>
  );
};