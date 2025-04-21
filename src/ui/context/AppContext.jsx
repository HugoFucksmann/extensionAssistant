import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { useLoading } from "../hooks/useLoading";
import { useMessages } from "../hooks/useMessages";
import { useProjectFiles } from "../hooks/useProjectFiles";
import { createBackendService, ACTIONS } from "../services/BackendService";

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
  
  // Estado básico
  const [backendService] = useState(() => createBackendService(vscode));
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [model, setModel] = useState("ollama");
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [projectFiles, setProjectFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Funciones básicas
  const addMessage = useCallback((message) => {
    console.log("Añadiendo mensaje:", message);
    setMessages(prev => [...prev, message]);
  }, []);

  const handleSendMessage = useCallback((message, files = []) => {
    console.log("Enviando mensaje:", message, files);
    addMessage({
      role: "user",
      text: message,
      files
    });
    setIsLoading(true);
    backendService.send(ACTIONS.SEND_MESSAGE, {
      message,
      selectedFiles: files,
      model
    });
  }, [backendService, addMessage, model]);

  const clearChat = useCallback(() => {
    console.log("Limpiando chat");
    setMessages([]);
    setCurrentMessage("");
    backendService.send(ACTIONS.CLEAR_CONVERSATION);
  }, [backendService]);

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

  // Manejar respuestas del backend
  useEffect(() => {
    if (!backendService) return;
    console.log("Configurando listeners de backend");

    const handleResponse = (data) => {
      console.log("Respuesta recibida:", data);
      if (!data.done) {
        setCurrentMessage(data.message || data.text || data.content || "");
      } else {
        addMessage({
          role: "assistant",
          text: data.message || data.text || data.content,
          files: data.files || []
        });
        setCurrentMessage("");
      }
      setIsLoading(false);
    };

    const handleError = (data) => {
      console.log("Error recibido:", data);
      addMessage({
        role: "assistant",
        text: data.error || "Error desconocido",
        isError: true
      });
      setIsLoading(false);
    };

    const handleHistoryLoaded = (data) => {
      console.log("Historial cargado:", data);
      setHistory(data.history || []);
    };

    backendService.on('response', handleResponse);
    backendService.on('error', handleError);
    backendService.on('historyLoaded', handleHistoryLoaded);

    return () => {
      backendService.off('response', handleResponse);
      backendService.off('error', handleError);
      backendService.off('historyLoaded', handleHistoryLoaded);
    };
  }, [backendService, addMessage]);

  const value = {
    backendService,
    vscode,
    input,
    setInput,
    selectedFiles,
    setSelectedFiles,
    isLoading,
    messages,
    currentMessage,
    addMessage,
    handleSendMessage,
    clearChat,
    history,
    showHistory,
    setShowHistory,
    handleLoadChat,
    handleShowHistory,
    projectFiles,
    model,
    setModel,
  };

  console.log("AppProvider inicializado");
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};