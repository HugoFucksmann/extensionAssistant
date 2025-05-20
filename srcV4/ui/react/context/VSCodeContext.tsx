// src/ui/context/VSCodeContext.tsx
import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { ChatMessage, PerformanceMetrics } from '../../../store/interfaces/entities';
import { ThemeType } from '../theme/theme';
import { getTheme } from '../theme/theme';

// Interfaz para chat
export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// Importamos las interfaces desde entities.ts pero renombramos para evitar conflictos
import { 
  ToolExecution as ToolExecutionEntity, 
  ProcessingStatus as ProcessingStatusEntity 
} from '../../../store/interfaces/entities';

// Usamos los tipos importados
export type ToolExecution = ToolExecutionEntity;
export type ProcessingStatus = ProcessingStatusEntity;

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
  // Estado de procesamiento para mostrar pasos intermedios
  processingStatus: ProcessingStatus;
  // Métodos para interactuar con herramientas
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
  const [messages, setMessages] = useState<ChatMessage[]>(() => []);
  const [chatList, setChatList] = useState<Chat[]>([]);
  const [currentModel, setCurrentModel] = useState('ollama');
  const [isLoading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  // Estado de procesamiento para mostrar pasos intermedios
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    phase: '',
    status: 'inactive',
    tools: []
  });

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
  
  // Método para ejecutar una herramienta manualmente
  const executeToolManually = (toolName: string, parameters: Record<string, any>) => {
    postMessage('command', {
      command: 'executeTool',
      tool: toolName,
      parameters
    });
  };
  
  // Método para cancelar la ejecución de una herramienta
  const cancelToolExecution = (toolName: string) => {
    postMessage('command', {
      command: 'cancelToolExecution',
      tool: toolName
    });
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
          // Resetear el estado de procesamiento
          setProcessingStatus({
            phase: '',
            status: 'inactive',
            tools: []
          });
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
          // Actualizar el estado de procesamiento para mostrar el error
          setProcessingStatus(prev => ({
            ...prev,
            status: 'inactive',
            phase: 'error'
          }));
          break;

        case 'themeChanged':
          setIsDarkMode(payload.isDarkMode);
          break;
          
        // Nuevos tipos de mensajes para el seguimiento de progreso
        case 'processingUpdate':
          setProcessingStatus(prev => ({
            ...prev,
            phase: payload.phase || prev.phase,
            status: payload.status === 'started' ? 'active' : 
                   payload.status === 'completed' ? 'completed' : prev.status
          }));
          break;
          
        case 'toolExecutionUpdate':
          setProcessingStatus(prev => {
            // Buscar si la herramienta ya existe en el array
            const toolIndex = prev.tools.findIndex(t => t.name === payload.tool);
            const updatedTools = [...prev.tools];
            
            if (toolIndex >= 0) {
              // Actualizar herramienta existente
              updatedTools[toolIndex] = {
                ...updatedTools[toolIndex],
                status: payload.status,
                ...(payload.status === 'completed' && { endTime: Date.now(), result: payload.result }),
                ...(payload.status === 'error' && { endTime: Date.now(), error: payload.error })
              };
            } else if (payload.status === 'started') {
              // Añadir nueva herramienta
              updatedTools.push({
                name: payload.tool,
                status: 'started',
                startTime: Date.now(),
                parameters: payload.parameters
              });
            }
            
            return {
              ...prev,
              tools: updatedTools
            };
          });
          break;
          
        case 'processingFinished':
          // No resetear inmediatamente para permitir ver el estado final
          setTimeout(() => {
            setProcessingStatus({
              phase: '',
              status: 'inactive',
              tools: []
            });
          }, 2000);
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
      toggleTheme,
      processingStatus,
      executeToolManually,
      cancelToolExecution
    }}>
      {children}
    </VSCodeContext.Provider>
  );
};