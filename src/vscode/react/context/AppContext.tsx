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
  processingPhase: string; // Podríamos deprec_old este si 'status' en metadata lo cubre mejor
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
  | { type: 'AGENT_ACTION_UPDATE'; payload: ChatMessage }; // <--- AÑADIDO

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
    case 'ADD_MESSAGE': // Usado para mensajes de usuario y respuestas finales del asistente
      return { 
        ...state, 
        messages: [...state.messages, action.payload],
        // isLoading se maneja por separado o por eventos de feedback
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_CHAT_ID':
      return { ...state, currentChatId: action.payload };
    case 'SET_SHOW_HISTORY':
      return { ...state, showHistory: action.payload };
    case 'SET_PROCESSING_PHASE': // Podría ser redundante con los nuevos mensajes de feedback
      return { ...state, processingPhase: action.payload };
    case 'NEW_CHAT_STARTED':
      return { 
        ...state, 
        messages: [], 
        currentChatId: action.payload.chatId, 
        isLoading: false, 
        showHistory: false 
      };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [], isLoading: false };
    case 'SET_CHAT_LIST':
      return { ...state, chatList: action.payload };
    case 'SET_CURRENT_MODEL':
      return { ...state, currentModel: action.payload };
    case 'TOGGLE_DARK_MODE':
      const newIsDarkMode = !state.isDarkMode;
      return { ...state, isDarkMode: newIsDarkMode, theme: getTheme(newIsDarkMode) };
    case 'SET_THEME':
        return { ...state, theme: action.payload };
    
    case 'AGENT_ACTION_UPDATE': // <--- AÑADIDO ESTE CASE
      // Los mensajes de feedback no deberían limpiar los mensajes existentes, sino añadirse.
      // El payload ya debería ser un ChatMessage formateado desde el backend.
      return {
        ...state,
        messages: [...state.messages, action.payload],
        isLoading: action.payload.metadata?.status === 'thinking' || 
                     action.payload.metadata?.status === 'tool_executing',
        processingPhase: action.payload.metadata?.status || state.processingPhase, // Actualizar phase si es relevante
      };

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
        case 'assistantResponse':
          dispatch({
            type: 'ADD_MESSAGE', payload: {
              id: payload.id || `asst_${Date.now()}`,
              content: payload.content || '',
              sender: 'assistant',
              timestamp: payload.timestamp || Date.now(),
              metadata: payload.metadata, // Pasar metadata (ej. { status: 'error' } si es una respuesta de error)
            }
          });
          dispatch({ type: 'SET_LOADING', payload: false }); // Asegurar que el loading principal se apague
          break;
        case 'newChatStarted':
          dispatch({ type: 'NEW_CHAT_STARTED', payload: { chatId: payload.chatId } });
          break;
        case 'processingUpdate': // Este es el mensaje que WebviewProvider enviaba antes
                                 // Ahora será reemplazado/complementado por 'agentActionUpdate'
          dispatch({ type: 'SET_PROCESSING_PHASE', payload: payload.phase || '' });
          if (payload.phase === 'processing' || payload.phase === 'thinking') { // Mantener por si se usa
            dispatch({ type: 'SET_LOADING', payload: true });
          } else {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
          break;
        
        case 'agentActionUpdate': // <--- AÑADIDO ESTE CASE
          dispatch({
            type: 'AGENT_ACTION_UPDATE',
            payload: { // Construir el ChatMessage aquí
              id: payload.id || `agent_${Date.now()}`,
              content: payload.content || '',
              sender: 'system', // Marcar como 'system' para diferenciarlo
              timestamp: payload.timestamp || Date.now(),
              metadata: { status: payload.status }, // Guardar el status
            }
          });
          // El isLoading se maneja en el reducer basado en el status
          break;

        case 'systemError': // Errores generales del sistema que no son feedback de ReAct
          dispatch({
            type: 'ADD_MESSAGE', payload: {
              id: `err_${Date.now()}`,
              content: `Error: ${payload.message}`,
              sender: 'system',
              timestamp: Date.now(),
              metadata: { status: 'error' }, // Marcar como error
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
  }, [state.isDarkMode, state.chatList.length]); // Añadido state.chatList.length a dependencias

  const sendMessage = (text: string, files: string[] = []) => {
    dispatch({
      type: 'ADD_MESSAGE', payload: {
        id: `user_${Date.now()}`,
        content: text,
        sender: 'user',
        timestamp: Date.now(),
        files: files,
      }
    });
    // No activar isLoading aquí directamente; dejar que los eventos de feedback lo manejen.
    // dispatch({ type: 'SET_LOADING', payload: true }); 
    postMessageToBackend('userMessageSent', { text, files });
  };

  const newChat = () => {
    postMessageToBackend('newChatRequestedByUI');
  };

  const setShowHistory = (show: boolean) => {
    dispatch({ type: 'SET_SHOW_HISTORY', payload: show });
    if (show) {
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