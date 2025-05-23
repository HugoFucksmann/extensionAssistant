// src/ui/context/VSCodeContext.tsx
import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';

import { ThemeType } from '../theme/theme';
import { getTheme } from '../theme/theme';

// Importar tipos compartidos
import { ChatMessage, ProcessingStatus as SharedProcessingStatus, ToolExecution as SharedToolExecution, Chat as SharedChat } from '@shared/types';

// Interfaz para chat (usar la de @shared/types si es la misma)
export type Chat = SharedChat; // Usar el tipo compartido

// Usamos los tipos importados
export type ToolExecution = SharedToolExecution;
export type ProcessingStatus = SharedProcessingStatus;

interface VSCodeContextType {
  messages: ChatMessage[];
  chatList: Chat[];
  currentModel: string;
  isLoading: boolean;
  showHistory: boolean;
  currentChatId: string | null; // Nuevo estado para el ID del chat actual
  setShowHistory: (show: boolean) => void;
  postMessage: (type: string, payload?: Record<string, unknown>) => void;
  loadChat: (chatId: string) => void;
  newChat: () => void; // Add newChat function
  theme: ThemeType;
  isDarkMode: boolean;
  toggleTheme: () => void;
  processingStatus: ProcessingStatus;
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatList, setChatList] = useState<Chat[]>([]);
  const [currentModel, setCurrentModel] = useState('ollama'); // Default o desde config
  const [isLoading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null); // Inicializar currentChatId

  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    phase: '',
    status: 'inactive',
    tools: []
  });

  const theme = useMemo(() => getTheme(isDarkMode), [isDarkMode]);

  const postMessage = (type: string, payload: Record<string, unknown> = {}) => {
    if (type === 'userMessage') {
      const userMsgPayload = payload as { text: string, files?: string[] };
      
      // If no chat ID, create a new chat first
      if (!currentChatId) {
        const newChatId = `chat_${Date.now()}`;
        console.log('No current chat ID, creating new chat:', newChatId);
        
        const userMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          content: userMsgPayload.text || '',
          sender: 'user',
          timestamp: Date.now(),
          files: userMsgPayload.files?.map(f => (typeof f === 'string' ? f : (f as any).path)) || []
        };
        
        // Update local state optimistically
        setCurrentChatId(newChatId);
        setMessages([userMessage]);
        setLoading(true);
        
        // Notify backend to create a new chat
        window.vscode.postMessage({
          type: 'createChat',
          payload: {
            chatId: newChatId,
            initialMessage: userMsgPayload.text,
            files: userMsgPayload.files
          }
        });
        return;
      }

      // Existing chat flow
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        content: userMsgPayload.text || '',
        sender: 'user',
        timestamp: Date.now(),
        files: userMsgPayload.files?.map(f => (typeof f === 'string' ? f : (f as any).path)) || []
      };
      
      // Update local state optimistically
      setMessages(prev => [...prev, userMessage]);
      setLoading(true);
      
      // Send message to backend
      window.vscode.postMessage({ 
        type: 'sendMessage', 
        text: userMsgPayload.text, 
        files: userMsgPayload.files,
        chatId: currentChatId 
      });
    } else if (type === 'command' && payload.command && typeof payload.command === 'string') {
      const commandActual = payload.command as string;
      let finalPayload: Record<string, unknown> = {};

      if (payload.payload && typeof payload.payload === 'object' && payload.payload !== null) {
        finalPayload = { ...(payload.payload as Record<string, unknown>) };
      } else {
        const { command, ...restOfPayload } = payload;
        finalPayload = restOfPayload;
      }
      
      window.vscode.postMessage({ type: commandActual, ...finalPayload });
    } else {
      window.vscode.postMessage({ type, ...payload });
    }
  };

  const loadChat = (chatId: string) => {
    postMessage('command', { 
      command: 'loadChat', 
      payload: { chatId } 
    });
    setShowHistory(false);
  };

  const newChat = () => {
    console.log('Iniciando nuevo chat...');
    
    // Limpiar el estado actual
    setMessages([]);
    setLoading(false);
    
    // Enviar comando para crear un nuevo chat
    window.vscode.postMessage({
      type: 'command',
      command: 'newChat'
    });
    
    // No establecer el ID del chat aquí, esperaremos la confirmación del backend
    setShowHistory(false);
    
    // Opcional: Podrías querer forzar un scroll al inicio
    setTimeout(() => {
      const chatContainer = document.getElementById('chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = 0;
      }
    }, 100);
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    // Persistir preferencia de tema (opcional, si el backend lo maneja)
    // window.vscode.postMessage({ type: 'command', command: 'setThemePreference', payload: { isDarkMode: newMode } });
  };
  
  const executeToolManually = (toolName: string, parameters: Record<string, any>) => {
    postMessage('command', {
      command: 'executeTool', // Backend debe manejar este comando
      payload: { tool: toolName, parameters }
    });
  };
  
  const cancelToolExecution = (toolName: string) => {
    postMessage('command', {
      command: 'cancelToolExecution', // Backend debe manejar este comando
      payload: { tool: toolName }
    });
  };

  // Initialize chat session on component mount
  useEffect(() => {
    // Request initial state when component mounts
    postMessage('command', { command: 'getInitialState' });
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<any>) => {
      const { type, payload } = event.data;
      console.log('Received message:', { type, payload });
      
      switch (type) {
        case 'initialState':
          if (payload.chatId) {
            setCurrentChatId(payload.chatId);
          }
          if (payload.messages) {
            setMessages(payload.messages);
          }
          break;
          
        case 'message':
          const message = {
            id: payload.id || `msg_${Date.now()}`,
            chatId: payload.chatId || currentChatId || 'unknown_chat',
            content: payload.content || '',
            sender: payload.sender || 'assistant',
            timestamp: payload.timestamp || Date.now(),
            metadata: payload.metadata || {},
            ...payload
          };
          
          setMessages(prev => {
            try {
              // Evitar duplicados
              if (prev.some(m => m.id === message.id || 
                               (m.content === message.content && 
                                m.sender === message.sender && 
                                Math.abs((m.timestamp || 0) - (message.timestamp || 0)) < 1000))) {
                console.log('Duplicate message detected, skipping:', message);
                return prev;
              }
              console.log('Adding new message:', message);
              return [...prev, message];
            } catch (error) {
              console.error('Error adding message to state:', error);
              return prev;
            }
          });
          
          if (message.sender === 'assistant') {
            setLoading(false);
          }
          break;
          
        case 'modelSwitched':
          setCurrentModel(payload.modelType);
          break;
          
        case 'chatsLoaded':
          setChatList(payload.chats);
          break;
          
        case 'chatLoaded':
          setMessages(payload.messages);
          setCurrentChatId(payload.chatId);
          setShowHistory(false);
          setLoading(false);
          break;
          
        case 'historyRequested':
          setShowHistory(true);
          break;

        case 'newChat':
          setMessages([]);
          if (payload.chatId) {
            setCurrentChatId(payload.chatId);
          }
          setLoading(false);
          break;
          
        case 'chatCleared':
          setMessages([]);
          setLoading(false);
          break;

        case 'error':
          const errorTimestamp = Date.now();
          setMessages(prev => [...prev, {
            id: `err_${errorTimestamp}`,
            chatId: currentChatId || 'error_chat',
            content: `Error: ${payload.message || 'Unknown error'}`,
            sender: 'system',
            timestamp: errorTimestamp
          }]);
          setLoading(false);
          setProcessingStatus(prev => ({
            ...prev,
            status: 'error',
            phase: 'error',
            error: payload.message
          }));
          break;

        case 'themeChanged':
          setIsDarkMode(payload.isDarkMode);
          break;
          
        case 'processingStatusUpdate':
          setProcessingStatus(payload);
          break;
          
        case 'toolExecutionUpdate':
          setProcessingStatus(prev => {
            const toolIndex = prev.tools.findIndex(t => t.name === payload.tool && t.status === 'started');
            const updatedTools = [...prev.tools];
            
            if (toolIndex >= 0) {
              updatedTools[toolIndex] = {
                ...updatedTools[toolIndex],
                status: payload.status,
                ...(payload.status === 'completed' && { endTime: payload.endTime || Date.now(), result: payload.result }),
                ...(payload.status === 'error' && { endTime: payload.endTime || Date.now(), error: payload.error })
              };
            } else if (payload.status === 'started') {
              updatedTools.push({
                name: payload.tool,
                status: 'started',
                startTime: payload.startTime || Date.now(),
                parameters: payload.parameters,
                result: undefined, 
                error: undefined,
                endTime: undefined
              });
            }
            
            return {
              ...prev,
              tools: updatedTools,
              status: 'active'
            };
          });
          break;
          
        case 'processingFinished':
          setProcessingStatus(prev => ({
            ...prev,
            phase: payload.error ? 'error' : 'completed',
            status: 'completed',
            endTime: Date.now(),
            error: payload.error ? payload.errorMessage : undefined
          }));
          
          setTimeout(() => {
            setProcessingStatus({
              phase: '',
              status: 'inactive',
              tools: []
            });
          }, 3000);
          break;
        
        case 'codeApplied':
          console.log('Code changes applied acknowledgement:', payload);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentChatId]);

  return (
    <VSCodeContext.Provider value={{ 
      messages, 
      chatList, 
      currentModel, 
      isLoading, 
      showHistory,
      currentChatId, 
      setShowHistory, 
      postMessage, 
      loadChat,
      newChat, // Add newChat to the context value
      theme,
      isDarkMode,
      toggleTheme,
      processingStatus,
      executeToolManually,
      cancelToolExecution
    }}>
      {children}
    </VSCodeContext.Provider>
  );
};