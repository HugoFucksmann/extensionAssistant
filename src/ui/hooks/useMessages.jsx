import { useState, useCallback, useEffect } from "react";

const normalizeMessage = (message) => {
  if (!message) return null;
  return {
    role: message.role || (message.isUser ? "user" : message.isAgent ? "agent" : "assistant"),
    text: message.text || message.content || message.message || "",
    files: Array.isArray(message.files) ? message.files : [],
    isError: message.isError || false,
    isAgent: message.isAgent || false,
    agente: message.agente || null,
    acción: message.acción || null,
  };
};

export const useMessages = (backendService) => {
  const [messages, setMessages] = useState(() => {
    const state = backendService?.getState() || {};
    return state.messages || [];
  });
  const [currentMessage, setCurrentMessage] = useState("");

  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, normalizeMessage(message)]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentMessage("");
    if (backendService) {
      backendService.setState({ messages: [] });
    }
  }, [backendService]);

  useEffect(() => {
    if (backendService) {
      backendService.setState({ messages });
    }
  }, [messages, backendService]);

  // Configurar listeners para mensajes recibidos del backend
  useEffect(() => {
    if (!backendService) return;

    const handleReceiveMessage = (data) => {
      console.log('Mensaje recibido del backend:', data);
      if (data.message) {
        addMessage({
          role: data.isUser ? 'user' : 'assistant',
          text: data.message,
          files: data.files || []
        });
      }
    };

    const handleChatCleared = () => {
      console.log('Chat limpiado');
      clearMessages();
    };

    const handleChatLoaded = (data) => {
      console.log('Chat cargado:', data);
      if (data.chat && data.chat.messages) {
        setMessages(data.chat.messages.map(normalizeMessage));
      }
    };

    backendService.on('receiveMessage', handleReceiveMessage);
    backendService.on('chatCleared', handleChatCleared);
    backendService.on('chatLoaded', handleChatLoaded);

    return () => {
      backendService.off('receiveMessage', handleReceiveMessage);
      backendService.off('chatCleared', handleChatCleared);
      backendService.off('chatLoaded', handleChatLoaded);
    };
  }, [backendService, addMessage, clearMessages]);



  return {
    messages,
    currentMessage,
    setCurrentMessage,
    addMessage,
    clearMessages,
  };
};