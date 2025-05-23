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
      
      if (!currentChatId) {
        console.error("Error: No current chat ID available for sending message.");
        // Podríamos generar uno aquí si es el primer mensaje y no hay chatSessionStarted aún.
        // O simplemente no enviar y mostrar un error/log.
        setLoading(false); // Reset loading
        return;
      }

      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`, // Generar un ID único para el mensaje
      //  chatId: currentChatId,
        content: userMsgPayload.text || '',
        sender: 'user',
        timestamp: Date.now(),
        // Normalizar files a string[] si es necesario, asumiendo que payload.files ya es string[] o compatible
        files: userMsgPayload.files?.map(f => (typeof f === 'string' ? f : (f as any).path)) || []
      };
      setMessages(prev => [...prev, userMessage]);
      setLoading(true);
      // Enviar al backend como 'sendMessage'
      window.vscode.postMessage({ 
        type: 'sendMessage', 
        text: userMsgPayload.text, 
        files: userMsgPayload.files, // Enviar la estructura que el backend espera
        chatId: currentChatId // Enviar el chatId actual
      });
    } else if (type === 'command') {
      window.vscode.postMessage({ type: 'command', ...(payload as Record<string, unknown>) });
    } else {
      window.vscode.postMessage({ type, ...payload });
    }
  };

  const loadChat = (chatId: string) => {
    postMessage('command', { 
      command: 'loadChat', 
      payload: { chatId } 
    });
    setShowHistory(false); // Esto podría moverse a cuando el chat realmente se carga
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

  useEffect(() => {
    const handleMessage = (event: MessageEvent<any>) => {
      const { type, payload } = event.data;
      
      switch (type) {
        case 'chatSessionStarted': // Nuevo mensaje desde WebviewProvider
          setCurrentChatId(payload.chatId);
          // Opcionalmente, limpiar mensajes si es una sesión completamente nueva
          // setMessages([]); 
          // setLoading(false);
          break;

        case 'messageAdded': // Unificado para respuestas de user y assistant
          setMessages(prev => {
            // Evitar duplicados si el mensaje ya existe (ej. mensaje de usuario añadido localmente)
            if (payload.sender === 'user' && prev.find(m => m.id === payload.id || (m.content === payload.content && m.timestamp === payload.timestamp))) {
              return prev;
            }
            return [...prev, payload as ChatMessage];
          });
          if (payload.sender === 'assistant') {
            setLoading(false);
            // Resetear el estado de procesamiento para el asistente
            // setProcessingStatus({ phase: '', status: 'inactive', tools: [] }); // Esto ya se hace en 'processingFinished'
          }
          break;
          
        case 'modelSwitched': // Alineado con MessageHandler
          setCurrentModel(payload.modelType);
          break;
          
        case 'chatsLoaded': // Alineado con MessageHandler
          setChatList(payload.chats);
          break;
          
        case 'chatLoaded':
          setMessages(payload.messages);
          setCurrentChatId(payload.chatId); // Actualizar currentChatId
          setShowHistory(false); // Cerrar historial si estaba abierto
          setLoading(false);
          break;
          
        case 'historyRequested': // Desde la UI o backend para mostrar el panel de historial
          setShowHistory(true);
          break;

        case 'newChat': // Backend confirma que se ha iniciado un nuevo chat (o la UI lo inicia)
          setMessages([]);
          // setCurrentChatId(payload.newChatId); // Si el backend genera y envía un nuevo ID
          setLoading(false);
          // Si la UI inicia 'newChat', necesita generar un ID y potencialmente informar al backend
          // Por ahora, asumimos que 'newChat' es una limpieza local y el backend podría enviar un nuevo 'chatSessionStarted'
          break;
          
        case 'chatCleared': // Backend confirma la limpieza
            setMessages([]);
            // setCurrentChatId(null); // O un nuevo ID si el backend lo proporciona
            setLoading(false);
            break;

        case 'error':
          const errorTimestamp = Date.now();
          setMessages(prev => [...prev, {
            id: `err_${errorTimestamp}`,
            chatId: currentChatId || 'error_chat',
            content: `Error: ${payload.message}`,
            sender: 'system',
            timestamp: errorTimestamp
          }]);
          setLoading(false);
          setProcessingStatus(prev => ({
            ...prev,
            status: 'error', // Cambiado de 'inactive' a 'error' para reflejar el estado
            phase: 'error',
            error: payload.message // Guardar el mensaje de error
          }));
          break;

        case 'themeChanged':
          setIsDarkMode(payload.isDarkMode);
          break;
          
        case 'processingStatusUpdate': // Desde WebviewProvider
          setProcessingStatus(payload); // Recibir el objeto completo
          break;
          
        case 'toolExecutionUpdate': // Desde WebviewProvider (ya compatible)
          setProcessingStatus(prev => {
            const toolIndex = prev.tools.findIndex(t => t.name === payload.tool && t.status === 'started'); // Asegurar que actualizamos el correcto si hay múltiples con mismo nombre
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
                // Asegurar que todos los campos de ToolExecution estén aquí
                result: undefined, 
                error: undefined,
                endTime: undefined
              });
            }
            
            return {
              ...prev,
              tools: updatedTools,
              status: 'active' // Mantener activo mientras haya herramientas o fases activas
            };
          });
          break;
          
        case 'processingFinished': // Desde WebviewProvider
          setProcessingStatus(prev => ({
            ...prev,
            phase: payload.error ? 'error' : 'completed',
            status: 'completed', // Marcar como completado para visualización final
            endTime: Date.now(),
            error: payload.error ? payload.errorMessage : undefined
          }));
          // Resetear después de un delay para permitir ver el estado final
          setTimeout(() => {
            setProcessingStatus({
              phase: '',
              status: 'inactive',
              tools: []
            });
          }, 3000); // Aumentado ligeramente el delay
          break;
        
        case 'codeApplied': // Nuevo, desde MessageHandler
          console.log('Code changes applied acknowledgement:', payload);
          // Aquí se podría mostrar una notificación al usuario si se desea
          // Ejemplo: addMessage({ sender: 'system', content: `Code changes to ${payload.filename} applied.`})
          break;
      }
    };

    // Request initial state or chat list on load
    // window.vscode.postMessage({ type: 'command', command: 'getInitialData' }); // O algo similar
    // O esperar a que 'chatSessionStarted' proporcione el ID inicial.
    // Por ahora, getChatList se llama desde el componente RecentChats si es necesario.

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []); // Cuidado con las dependencias aquí, currentChatId podría ser una.

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