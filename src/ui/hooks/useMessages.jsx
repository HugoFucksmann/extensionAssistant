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

  useEffect(() => {
    if (backendService) {
      backendService.setState({ messages });
    }
  }, [messages, backendService]);

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

  return {
    messages,
    currentMessage,
    setCurrentMessage,
    addMessage,
    clearMessages,
  };
};