// src/vscode/react/context/AppContext.tsx

import '../../types';
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { ChatMessage, Chat } from '../../../features/chat/types';

// @ts-ignore
import { getTheme } from '../theme/theme.js';

type ThemeType = any;

interface AppState {
  messages: ChatMessage[];
  chatList: Chat[];
  currentChatId: string | null;
  isLoading: boolean; 
  showHistory: boolean;
  currentModel: string;
  isDarkMode: boolean;
  theme: ThemeType;
  testModeEnabled: boolean;
  activeFeedbackOperationId: string | null; 
  loadingText: string; 
}

type AppAction =
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; operationId?: string; [key: string]: any } }
  | { type: 'SET_LOADING'; payload: { loading: boolean; text?: string } } 
  | { type: 'SET_CHAT_ID'; payload: string | null }
  | { type: 'SET_SHOW_HISTORY'; payload: boolean }
  | { type: 'NEW_CHAT_STARTED'; payload: { chatId: string } }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_CHAT_LIST'; payload: Chat[] }
  | { type: 'SET_CURRENT_MODEL'; payload: string }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'SET_THEME'; payload: ThemeType }
  | { type: 'SET_TEST_MODE'; payload: boolean }
  | { type: 'SESSION_READY'; payload: { chatId: string; messages: ChatMessage[]; model?: string; history?: Chat[]; testMode?: boolean } }
  | { type: 'SET_LOADING_TEXT'; payload: string }
  | { type: 'SET_ACTIVE_FEEDBACK_OPERATION_ID'; payload: string | null };



const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const body = isBrowser ? document.body : null;
const initialIsDarkMode = isBrowser && body ? body.classList.contains('vscode-dark') : false;
const DEFAULT_LOADING_TEXT = 'AI is thinking...';

const initialState: AppState = {
  messages: [],
  chatList: [],
  currentChatId: null,
  isLoading: false,
  showHistory: false,
  currentModel: 'gemini',
  isDarkMode: initialIsDarkMode,
  theme: getTheme(initialIsDarkMode),
  testModeEnabled: false,
  activeFeedbackOperationId: null,
  loadingText: DEFAULT_LOADING_TEXT,
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
        testModeEnabled: action.payload.testMode !== undefined ? action.payload.testMode : state.testModeEnabled,
        loadingText: DEFAULT_LOADING_TEXT,
        activeFeedbackOperationId: null,
      };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload, isLoading: false, loadingText: DEFAULT_LOADING_TEXT, activeFeedbackOperationId: null };
    case 'SET_LOADING': 
      return {
        ...state,
        isLoading: action.payload.loading,
        loadingText: action.payload.loading ? (action.payload.text || state.loadingText) : DEFAULT_LOADING_TEXT,
       
      };
    case 'SET_LOADING_TEXT':
      return { ...state, loadingText: action.payload };
    case 'SET_ACTIVE_FEEDBACK_OPERATION_ID':
      return { ...state, activeFeedbackOperationId: action.payload };
    case 'SET_CHAT_ID':
      return { ...state, currentChatId: action.payload };
    case 'SET_SHOW_HISTORY':
      return { ...state, showHistory: action.payload };
    case 'NEW_CHAT_STARTED':
      return {
        ...state,
        messages: [],
        currentChatId: action.payload.chatId,
        isLoading: false,
        showHistory: false,
        loadingText: DEFAULT_LOADING_TEXT,
        activeFeedbackOperationId: null,
      };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [], isLoading: false, loadingText: DEFAULT_LOADING_TEXT, activeFeedbackOperationId: null };
    case 'SET_CHAT_LIST':
      return { ...state, chatList: action.payload };
    case 'SET_CURRENT_MODEL':
      return { ...state, currentModel: action.payload };
    case 'TOGGLE_DARK_MODE': {
      const newIsDarkMode = !state.isDarkMode;
      return { ...state, isDarkMode: newIsDarkMode, theme: getTheme(newIsDarkMode) };
    }
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_TEST_MODE':
      return { ...state, testModeEnabled: action.payload };
    case 'ADD_MESSAGE': {
      const msg = action.payload;
      
      const uniqueMsgKey = msg.operationId || msg.id; 

      const existingIndex = state.messages.findIndex(m => (m.operationId || m.id) === uniqueMsgKey);

      if (existingIndex !== -1) {
       
        const updatedMessages = [...state.messages];
        updatedMessages[existingIndex] = {
          ...updatedMessages[existingIndex], 
          ...msg, 
          id: updatedMessages[existingIndex].id, 
          operationId: msg.operationId || updatedMessages[existingIndex].operationId,
          metadata: {
            ...updatedMessages[existingIndex].metadata,
            ...msg.metadata,
          },
        };
        return { ...state, messages: updatedMessages };
      } else {
      
        return { ...state, messages: [...state.messages, msg] };
      }
    }
    case 'UPDATE_MESSAGE': { 
      const { id, operationId, ...rest } = action.payload;
      const msgIdToUpdate = operationId || id;
      const idx = state.messages.findIndex(msg => (msg.operationId || msg.id) === msgIdToUpdate);
      
      if (idx === -1) {
        console.warn(`[AppContext] UPDATE_MESSAGE: Message with id/operationId ${msgIdToUpdate} not found for update.`);
        return state; 
      }
      
      const updatedMessages = [...state.messages];
      updatedMessages[idx] = {
        ...updatedMessages[idx],
        ...rest,
       
        timestamp: rest.timestamp || updatedMessages[idx].timestamp,
        metadata: {
          ...updatedMessages[idx].metadata,
          ...rest.metadata,
        }
      };
      return { ...state, messages: updatedMessages };
    }
    default:
      return state;
  }
}

interface AppContextType extends AppState {
  postMessage: (type: string, payload?: any) => void;
  sendMessage: (text: string, files?: string[]) => void;
  newChat: () => void;
  setShowHistory: (show: boolean) => void;
  loadChat: (chatId: string) => void;
  switchModel: (modelType: string) => void;
  toggleDarkMode: () => void;
  
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
    (window as any).vscode?.postMessage({ type, payload });
  };

  useEffect(() => {
    const win = window as any;
    const doc = document as any;
    const body = doc.body as any;

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      console.log('[WebView EventSource] Received message from extension:', type, payload);


      switch (type) {
        case 'sessionReady':
          dispatch({ type: 'SESSION_READY', payload });
          break;
        case 'assistantResponse':
          dispatch({
            type: 'ADD_MESSAGE', payload: {
              id: payload.id || `asst_${Date.now()}`,
              content: payload.content || '',
              sender: 'assistant',
              timestamp: payload.timestamp || Date.now(),
              metadata: payload.metadata || { status: 'completed' },
              operationId: payload.operationId,
            }
          });
          dispatch({ type: 'SET_LOADING', payload: { loading: false } }); 
          dispatch({ type: 'SET_ACTIVE_FEEDBACK_OPERATION_ID', payload: null }); 
          break;
        case 'newChatStarted':
          dispatch({ type: 'NEW_CHAT_STARTED', payload: { chatId: payload.chatId } });
          break;
        case 'agentActionUpdate': 
          dispatch({ type: 'ADD_MESSAGE', payload });
          if (payload.metadata?.status === 'tool_executing') {
            dispatch({ type: 'SET_ACTIVE_FEEDBACK_OPERATION_ID', payload: payload.operationId || payload.id });
            dispatch({ type: 'SET_LOADING_TEXT', payload: payload.content || `Ejecutando ${payload.metadata.toolName}...` });
            dispatch({ type: 'SET_LOADING', payload: { loading: true } }); 
          } else if (payload.metadata?.status === 'success' || payload.metadata?.status === 'error') {
         
            if (state.isLoading) { 
                 dispatch({ type: 'SET_LOADING_TEXT', payload: DEFAULT_LOADING_TEXT });
            }
            
          }
          break;
        case 'agentPhaseUpdate':
          
          if (state.isLoading) { 
            dispatch({ type: 'SET_LOADING_TEXT', payload: payload.content || DEFAULT_LOADING_TEXT });
          }
        
          break;
        case 'systemError':
          dispatch({
            type: 'ADD_MESSAGE', payload: {
              id: payload.id || `err_${Date.now()}`,
              content: payload.content,
              sender: 'system',
              timestamp: payload.timestamp || Date.now(),
              metadata: payload.metadata || { status: 'error' },
              operationId: payload.operationId,
            }
          });
          dispatch({ type: 'SET_LOADING', payload: { loading: false } }); 
          dispatch({ type: 'SET_ACTIVE_FEEDBACK_OPERATION_ID', payload: null });
          break;
        case 'chatHistory':
          dispatch({ type: 'SET_CHAT_LIST', payload: payload.history || [] });
          break;
        case 'chatLoaded':
          dispatch({ type: 'SET_MESSAGES', payload: payload.messages || [] });
          dispatch({ type: 'SET_CHAT_ID', payload: payload.chatId });
          dispatch({ type: 'SET_SHOW_HISTORY', payload: false });
          break;
        case 'modelSwitched':
          dispatch({ type: 'SET_CURRENT_MODEL', payload: payload.modelType });
          break;
        case 'themeChanged': 
          const newThemeIsDark = payload.theme === 'dark';
          if (state.isDarkMode !== newThemeIsDark) {
            dispatch({ type: 'TOGGLE_DARK_MODE' });
          }
          break;
        case 'testModeChanged':
          dispatch({ type: 'SET_TEST_MODE', payload: payload.enabled });
          break;
        case 'showHistory': 
          dispatch({ type: 'SET_SHOW_HISTORY', payload: true });
          if (state.chatList.length === 0) {
            postMessageToBackend('command', { command: 'getChatHistory' });
          }
          break;
      }
    };

    win.addEventListener('message', handleMessage);
    postMessageToBackend('uiReady'); 

    const observer = new MutationObserver(() => {
      const isDark = body.classList.contains('vscode-dark');
      if (state.isDarkMode !== isDark) {
        dispatch({ type: 'TOGGLE_DARK_MODE' });
      }
    });
    observer.observe(body, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      win.removeEventListener('message', handleMessage);
      observer.disconnect();
    };

  }, [state.isDarkMode, state.chatList.length]); 

  const sendMessage = (text: string, files: string[] = []) => {
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      content: text,
      sender: 'user',
      timestamp: Date.now(),
      files: files,
    };
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_LOADING', payload: { loading: true, text: DEFAULT_LOADING_TEXT } }); // Iniciar carga global
    postMessageToBackend('userMessageSent', { text, files });
  };

  const newChat = () => {
    postMessageToBackend('newChatRequestedByUI');
  };

  const setShowHistory = (show: boolean) => {
    dispatch({ type: 'SET_SHOW_HISTORY', payload: show });
    if (show && state.chatList.length === 0) {
      postMessageToBackend('command', { command: 'getChatHistory' });
    }
  };

  const loadChat = (chatId: string) => {
    postMessageToBackend('command', { command: 'loadChat', chatId });
  };

  const switchModel = (modelType: string) => {
    postMessageToBackend('command', { command: 'switchModel', modelType });
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