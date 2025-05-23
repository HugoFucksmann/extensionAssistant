// src/ui/context/VSCodeContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useReducer, useState, useCallback } from 'react';
import { ThemeType, getTheme } from '../theme/theme'; // Ajusta la ruta
import { ChatMessage, ProcessingStatus, Chat } from '@shared/types'; // Ajusta la ruta
import { chatReducer, initialChatState } from './state/ChatStateManager';
import { initialProcessingState, processingReducer } from './state/ProcessingStateManager';
import { MessageService } from './MessageService';





interface VSCodeContextType {
  // Chat state
  messages: ChatMessage[];
  chatList: Chat[];
  currentChatId: string | null;
  isLoading: boolean;
  showHistory: boolean;

  // UI state
  currentModel: string; // Podría venir de config de VS Code
  theme: ThemeType;
  isDarkMode: boolean;
  processingStatus: ProcessingStatus;

  // Actions
  sendMessage: (text: string, files?: string[]) => void;
  postCommandToBackend: (commandType: string, payload?: Record<string, unknown>) => void; // Renombrado para claridad
  loadChat: (chatId: string) => void;
  requestNewChat: () => void; // Renombrado para claridad
  setShowHistory: (show: boolean) => void;
  clearCurrentChatMessages: () => void; // Para el botón de limpiar chat actual
  // toggleTheme: () => void; // ThemeManager en backend lo maneja, la UI recibe themeChanged
  // executeToolManually, cancelToolExecution (si aún son necesarios desde la UI)
}

declare global {
  interface Window {
    vscode: {
      postMessage: (message: unknown) => void;
      getState: () => any; // Para persistencia de estado de UI si es necesario
      setState: (newState: any) => void;
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
  const [chatState, dispatchChat] = useReducer(chatReducer, initialChatState);
  const [processingStatus, dispatchProcessing] = useReducer(processingReducer, initialProcessingState);

  const [currentModel, setCurrentModel] = useState('gemini'); // Default, se actualizará con modelSwitched
  const [isDarkMode, setIsDarkMode] = useState(window.matchMedia?.('(prefers-color-scheme: dark)').matches || false);

  const messageService = useMemo(() => MessageService.getInstance(), []);
  const theme = useMemo(() => getTheme(isDarkMode), [isDarkMode]);

  const getCurrentChatIdCallback = useCallback(() => chatState.currentChatId, [chatState.currentChatId]);

  // Listen for messages from the extension and dispatch actions
  useEffect(() => {
    messageService.postMessage('webview:ready');
    
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'extension:sessionReady':
          dispatchChat({ type: 'SET_ACTIVE_CHAT', payload: { chatId: message.payload.chatId, messages: message.payload.messages } });
          break;
        case 'extension:newChatStarted':
          dispatchChat({ type: 'SET_ACTIVE_CHAT', payload: { chatId: message.payload.chatId, messages: [] } });
          break;
        case 'extension:chatLoaded':
          dispatchChat({ type: 'SET_ACTIVE_CHAT', payload: { chatId: message.payload.chatId, messages: message.payload.messages } });
          break;
        case 'extension:chatCleared':
          dispatchChat({ type: 'CLEAR_MESSAGES' });
          break;
        case 'extension:processingUpdate': {
          // Support phase/status/tools updates
          if (typeof message.payload.phase === 'string') {
            dispatchProcessing({ type: 'SET_PHASE', payload: message.payload.phase });
          }
          if (typeof message.payload.status === 'string') {
            dispatchProcessing({ type: 'SET_STATUS', payload: message.payload.status });
          }
          if (Array.isArray(message.payload.tools)) {
            dispatchProcessing({ type: 'UPDATE_TOOL', payload: message.payload.tools });
          }
          break;
        }
        case 'extension:systemError':
          // Optionally handle error state in context
          break;
        default:
          // Ignore unknown message types
          break;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [messageService, dispatchChat, dispatchProcessing]);

  // Agregar un efecto separado para manejar el estado inicial
  useEffect(() => {
    if (!chatState.currentChatId) {
      // Mantener UI en estado inicial hasta que el usuario inicie un nuevo chat
      // No solicitar automáticamente un nuevo chat
      console.log('[VSCodeContext] Inicializando en estado vacío. Esperando acción del usuario.');
    }
  }, [chatState.currentChatId]); // messageHandler es estable

  // Acciones para la UI
  const postCommandToBackend = useCallback((commandType: string, payload: Record<string, unknown> = {}) => {
    messageService.postMessage(commandType, payload);
  }, [messageService]);

  const sendMessage = useCallback((text: string, files: string[] = []) => {
    if (!chatState.currentChatId) {
      console.error("VSCodeContext: Cannot send message, no currentChatId.");
      // Podría mostrar un error al usuario o solicitar iniciar un nuevo chat.
      // Quizás llamar a requestNewChat si no hay currentChatId?
      // Por ahora, no enviar si no hay chat.
      postCommandToBackend('webview:requestNewChat'); // Si no hay chat, intenta crear uno nuevo
      // Y luego el usuario tendrá que reenviar el mensaje. O podríamos encolarlo.
      // Mejor aún, deshabilitar el input si no hay currentChatId.
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      content: text || '',
      sender: 'user',
      timestamp: Date.now(),
      files: files.map(f => (typeof f === 'string' ? f : (f as any).path || String(f)))
    };

    dispatchChat({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatchChat({ type: 'SET_LOADING', payload: true });

    postCommandToBackend('webview:sendMessage', {
      text,
      files,
      chatId: chatState.currentChatId
    });
  }, [chatState.currentChatId, postCommandToBackend]);

  const loadChat = useCallback((chatId: string) => {
    if (chatState.currentChatId === chatId) return; // Ya está cargado
    dispatchChat({ type: 'SET_LOADING', payload: true }); // Mostrar carga mientras se cambia
    postCommandToBackend('webview:loadChat', { chatId });
  }, [chatState.currentChatId, postCommandToBackend]);

  const requestNewChat = useCallback(() => {
    dispatchChat({ type: 'SET_LOADING', payload: true }); // Mostrar carga
    postCommandToBackend('webview:requestNewChat');
  }, [postCommandToBackend]);

  const setShowHistory = useCallback((show: boolean) => {
    if (show && chatState.chatList.length === 0) {
        // Si se pide mostrar historial y no hay chats, solicitarlos.
        postCommandToBackend('webview:requestChatList'); // Asumiendo que este comando existe
    }
    dispatchChat({ type: 'SET_SHOW_HISTORY', payload: show });
  }, [chatState.chatList.length, postCommandToBackend]);

  const clearCurrentChatMessages = useCallback(() => {
    if (chatState.currentChatId) {
        // Optimistamente limpiar mensajes en la UI
        dispatchChat({ type: 'CLEAR_MESSAGES' });
        // Solicitar al backend que limpie el historial del chat
        postCommandToBackend('webview:clearChat', { chatId: chatState.currentChatId });
    }
  }, [chatState.currentChatId, postCommandToBackend]);


  const contextValue: VSCodeContextType = {
    messages: chatState.messages,
    chatList: chatState.chatList,
    currentChatId: chatState.currentChatId,
    isLoading: chatState.isLoading,
    showHistory: chatState.showHistory,
    currentModel,
    theme,
    isDarkMode,
    processingStatus,
    sendMessage,
    postCommandToBackend,
    loadChat,
    requestNewChat,
    setShowHistory,
    clearCurrentChatMessages,
  };

  return (
    <VSCodeContext.Provider value={contextValue}>
      {children}
    </VSCodeContext.Provider>
  );
};