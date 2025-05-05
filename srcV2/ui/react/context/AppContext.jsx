import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useLoading } from "../hooks/useLoading";
import { useMessages } from "../hooks/useMessages";
import { useProjectFiles } from "../hooks/useProjectFiles";
import { createBackendService, ACTIONS } from "../services/BackendService";
import { MESSAGE_TYPES } from '../../../core/config/constants';


// Crear el contexto
const AppContext = createContext(null);

// Hook para acceder al contexto
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext debe ser usado dentro de un AppProvider');
  }
  return context;
};

// Componente proveedor
export const AppProvider = ({ children, vscode }) => {
  console.log("Inicializando AppProvider");
  
  // Inicializar el servicio de backend
  const [backendService] = useState(() => createBackendService(vscode));

  // Cargar historial automáticamente al montar la app
  React.useEffect(() => {
    if (backendService) {
      backendService.send(ACTIONS.LOAD_HISTORY);
    }
  }, [backendService]);
  
  // Utilizar los hooks existentes
  const { loadingState, setLoading, setInitialized } = useLoading();
  const { 
    messages, 
    currentMessage, 
    setCurrentMessage, 
    addMessage, 
    clearMessages 
  } = useMessages(backendService);
  const { projectFiles } = useProjectFiles(backendService);
  
  // Estado adicional que no está cubierto por los hooks
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [model, setModel] = useState("ollama");

  // Funciones de manejo de mensajes
  const handleSendMessage = useCallback((message, files = []) => {
    console.log("Enviando mensaje:", message, files);
    addMessage({
      role: "user",
      text: message,
      files
    });
    setLoading(true);
    backendService.send(ACTIONS.SEND_MESSAGE, {
      message,
      selectedFiles: files,
      model
    });
  }, [backendService, addMessage, model, setLoading]);

  const clearChat = useCallback(() => {
    console.log("Limpiando chat");
    clearMessages();
  }, [clearMessages]);

  const handleNewChat = useCallback(() => {
    console.log("Creando nuevo chat");
    clearMessages();
    backendService.send(ACTIONS.NEW_CHAT);
  }, [backendService, clearMessages]);

  const handleLoadChat = useCallback((chatId) => {
    console.log("Cargando chat:", chatId);
    backendService.send(ACTIONS.LOAD_CHAT, { chatId });
    setShowHistory(false);
  }, [backendService]);

  const handleShowHistory = useCallback(() => {
    console.log("Mostrando historial");
    backendService.send(ACTIONS.LOAD_HISTORY);
    setShowHistory(true);
  }, [backendService]);

  // Configurar listeners para el backend
  // Nota: Estos listeners ahora están en los hooks individuales
  // pero mantenemos algunos específicos para este contexto
  const setupBackendListeners = useCallback(() => {
    if (!backendService) return () => {};
    
    const handleHistoryLoaded = (data) => {
      console.log("Historial cargado:", data);
      setHistory(data.history || []);
    };

    const handleChatCreated = (data) => {
      console.log("Nuevo chat creado:", data.chat);
      clearMessages(); // Limpiar mensajes anteriores
      // Opcional: Resetear otros estados (input, archivos seleccionados, etc.)
      setInput("");
      setSelectedFiles([]);
    };
    
    backendService.on('historyLoaded', handleHistoryLoaded);
    backendService.on(MESSAGE_TYPES.CHAT_CREATED, handleChatCreated);
    
    return () => {
      backendService.off(MESSAGE_TYPES.CHAT_CREATED, handleChatCreated);
      backendService.off('historyLoaded', handleHistoryLoaded);
    };
  }, [backendService, clearMessages, setInput, setSelectedFiles]);
  
  // Ejecutar la configuración de listeners
  React.useEffect(() => {
    const cleanup = setupBackendListeners();
    return cleanup;
  }, [setupBackendListeners]);

  // Memoizar el objeto value para evitar recreaciones innecesarias en cada renderizado
  const value = useMemo(() => ({
    // Servicio de backend y vscode
    backendService,
    vscode,
    
    // Estado de carga desde useLoading
    isLoading: loadingState.isLoading,
    isInitialized: loadingState.isInitialized,
    setLoading,
    setInitialized,
    
    // Estado de mensajes desde useMessages
    messages,
    currentMessage,
    setCurrentMessage,
    addMessage,
    
    // Estado de archivos del proyecto desde useProjectFiles
    projectFiles,
    
    // Estado y funciones adicionales
    input,
    setInput,
    selectedFiles,
    setSelectedFiles,
    handleSendMessage,
    clearChat,
    handleNewChat,
    history,
    showHistory,
    setShowHistory,
    handleLoadChat,
    handleShowHistory,
    model,
    setModel,
  }), [
    backendService, vscode,
    loadingState.isLoading, loadingState.isInitialized, setLoading, setInitialized,
    messages, currentMessage, setCurrentMessage, addMessage,
    projectFiles,
    input, setInput, selectedFiles, setSelectedFiles,
    handleSendMessage, clearChat, handleNewChat,
    history, showHistory, setShowHistory, handleLoadChat, handleShowHistory,
    model, setModel
  ]);

  console.log("AppProvider inicializado");
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};