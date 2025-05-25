// src/vscode/react/context/AppContext.tsx

import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { ChatMessage, Chat } from '@shared/types';
import { getTheme, ThemeType } from '../theme/theme';

declare global {
  interface Window {
    vscode?: {
      postMessage: (message: any) => void;
      getState: () => any;
      setState: (state: any) => void;
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
  theme: ThemeType;
  processingPhase: string; 
  activeFeedbackOperationId: string | null;
  feedbackMessages: { [operationId: string]: ChatMessage[] };
}

type AppAction =
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CHAT_ID'; payload: string | null }
  | { type: 'SET_SHOW_HISTORY'; payload: boolean }
  | { type: 'SET_PROCESSING_PHASE'; payload: string }
  | { type: 'NEW_CHAT_STARTED'; payload: { chatId: string } }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_CHAT_LIST'; payload: Chat[] }
  | { type: 'SET_CURRENT_MODEL'; payload: string }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'SET_THEME'; payload: ThemeType }
  | { type: 'SESSION_READY'; payload: { chatId: string; messages: ChatMessage[]; model?: string; history?: Chat[] } }
  | { type: 'AGENT_ACTION_UPDATE'; payload: ChatMessage };

const body = document.body;
const initialIsDarkMode = body.classList.contains('vscode-dark');

const initialState: AppState = {
  messages: [],
  chatList: [],
  currentChatId: null,
  isLoading: false,
  showHistory: false,
  currentModel: 'gemini',
  isDarkMode: initialIsDarkMode,
  theme: getTheme(initialIsDarkMode),
  processingPhase: '',
  activeFeedbackOperationId: null,
  feedbackMessages: {},
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
        activeFeedbackOperationId: null,
        feedbackMessages: {},
      };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_CHAT_ID':
      return { ...state, currentChatId: action.payload };
    case 'SET_SHOW_HISTORY':
      return { ...state, showHistory: action.payload };
    case 'SET_PROCESSING_PHASE': 
      return { ...state, processingPhase: action.payload };
    case 'NEW_CHAT_STARTED':
      return { 
        ...state, 
        messages: [], 
        currentChatId: action.payload.chatId, 
        isLoading: false, 
        showHistory: false,
        activeFeedbackOperationId: null,
        feedbackMessages: {},
      };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [], isLoading: false, activeFeedbackOperationId: null, feedbackMessages: {} };
    case 'SET_CHAT_LIST':
      return { ...state, chatList: action.payload };
    case 'SET_CURRENT_MODEL':
      return { ...state, currentModel: action.payload };
    case 'TOGGLE_DARK_MODE':
      const newIsDarkMode = !state.isDarkMode;
      return { ...state, isDarkMode: newIsDarkMode, theme: getTheme(newIsDarkMode) };
    case 'SET_THEME':
        return { ...state, theme: action.payload };
    
    case 'AGENT_ACTION_UPDATE': {
      const opId = action.payload.metadata?.operationId;
      if (!opId) return state; 

   
      const updatedMessages = [...state.messages, action.payload];
      
     
      return {
        ...state,
        messages: updatedMessages,
        activeFeedbackOperationId: opId,
        feedbackMessages: {
          ...state.feedbackMessages,
          [opId]: [...(state.feedbackMessages[opId] || []), action.payload]
        },
        isLoading: action.payload.metadata?.status === 'thinking' || 
                     action.payload.metadata?.status === 'tool_executing',
        processingPhase: action.payload.metadata?.status || state.processingPhase,
      };
    }
    
    case 'ADD_MESSAGE': { // Used for user messages and final assistant responses
      const newState = {
        ...state,
        messages: [...state.messages, action.payload],
        // isLoading is handled by SET_LOADING or by AGENT_ACTION_UPDATE for ongoing processes
      };
      
      // If this is a final assistant response and an operation was active, clear it.
      const isAssistantFinalResponse = action.payload.sender === 'assistant';
      if (isAssistantFinalResponse) {
       
        newState.isLoading = false; 
        newState.processingPhase = action.payload.metadata?.status || 'completed'; 
      }
      return newState;
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
    window.vscode?.postMessage({ type, payload });
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      console.log('[AppContext] Received from backend:', type, payload);

      switch (type) {
        case 'sessionReady':
          dispatch({ type: 'SESSION_READY', payload });
          break;
        case 'assistantResponse': // This is the FINAL response from the assistant
          dispatch({
            type: 'ADD_MESSAGE', payload: {
              id: payload.id || `asst_${Date.now()}`,
              content: payload.content || '',
              sender: 'assistant',
              timestamp: payload.timestamp || Date.now(),
              metadata: payload.metadata || { status: 'completed' }, 
            }
          });
          dispatch({ type: 'SET_LOADING', payload: false }); 
          // activeFeedbackOperationId is cleared in the ADD_MESSAGE reducer
          break;
        case 'newChatStarted':
          dispatch({ type: 'NEW_CHAT_STARTED', payload: { chatId: payload.chatId } });
          break;
        case 'processingUpdate': 
          // This event might be deprecated in favor of agentActionUpdate's status
          dispatch({ type: 'SET_PROCESSING_PHASE', payload: payload.phase || '' });
          if (payload.phase === 'processing' || payload.phase === 'thinking') {
            dispatch({ type: 'SET_LOADING', payload: true });
          } else if (payload.phase === 'completed' || payload.phase === 'error') {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
          break;
        
        case 'agentActionUpdate': // For intermediate feedback steps
          dispatch({
            type: 'AGENT_ACTION_UPDATE',
            payload: {
              id: payload.id || `agent_${Date.now()}`,
              content: payload.content || '',
              sender: 'system', // Feedback messages are from 'system'
              timestamp: payload.timestamp || Date.now(),
              metadata: {
                status: payload.status, // e.g., 'thinking', 'tool_executing', 'tool_completed', 'error'
                operationId: payload.operationId, // Crucial for grouping
                toolName: payload.toolName, // Optional: if a tool is involved
                // ...any other relevant metadata for feedback
              },
            }
          });
          // isLoading and processingPhase are handled within the AGENT_ACTION_UPDATE reducer
          break;

        case 'systemError': // General system errors not tied to a specific ReAct operation
          dispatch({
            type: 'ADD_MESSAGE', payload: {
              id: `err_${Date.now()}`,
              content: `Error: ${payload.message}`,
              sender: 'system', // General system error
              timestamp: Date.now(),
              metadata: { status: 'error' }, 
            }
          });
          dispatch({ type: 'SET_LOADING', payload: false });
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
        case 'showHistory':
            dispatch({ type: 'SET_SHOW_HISTORY', payload: true });
            if (state.chatList.length === 0) {
                postMessageToBackend('command', { command: 'getChatHistory' });
            }
            break;
      }
    };

    window.addEventListener('message', handleMessage);
    postMessageToBackend('uiReady');

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
    // SET_LOADING true will be triggered by the first AGENT_ACTION_UPDATE from backend
    postMessageToBackend('userMessageSent', { text, files });
  };

  const newChat = () => {
    postMessageToBackend('newChatRequestedByUI');
  };

  const setShowHistory = (show: boolean) => {
    dispatch({ type: 'SET_SHOW_HISTORY', payload: show });
    if (show && state.chatList.length === 0) { // Fetch only if history is empty and being shown
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