import React, { useRef, useEffect, memo } from "react";
import { styles } from "./styles";
import { UserMessage } from "./Message/UserMessage";
import { AIMessage } from "./Message/AIMessage";
import { AgentMessage } from "./Message/AgentMessage";
import { useAppContext } from '../../context/AppContext';

const Message = memo(({ message, messageIndex, onEdit }) => {
  
  const formattedMessage = {
    ...message,
    role: message.role || (message.isUser ? "user" : message.isAgent ? "agent" : "assistant"),
    text: message.text || message.content || message.message,
    files: Array.isArray(message.files) 
      ? message.files.map(file => typeof file === 'string' ? { path: file, content: undefined } : file)
      : [],
    agente: message.agente || null,
    acción: message.acción || null,
  };

  if (formattedMessage.role === "user") {
    return <UserMessage message={formattedMessage} messageIndex={messageIndex} onEdit={onEdit} />;
  } else if (formattedMessage.role === "agent") {
    return <AgentMessage message={formattedMessage} />;
  } else {
    return <AIMessage message={formattedMessage} />;
  }
});

const ChatMessages = ({ children }) => {
  try {
    console.log("Renderizando ChatMessages");
    const { 
      messages, 
      isLoading, 
      currentMessage,
      handleSendMessage
    } = useAppContext();

    const messagesEndRef = useRef(null);

    useEffect(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [messages, currentMessage]);

    const handleEditMessage = (messageIndex, newText, files) => {
      const filePaths = files?.map(file => 
        typeof file === 'string' ? file : file.path
      ) || [];
      
      handleSendMessage(newText, filePaths);
    };

    return (
      <div style={styles.container}>
        {messages.map((message, index) => (
          <Message
            key={`${index}-${message.text}`}
            message={message}
            messageIndex={index}
            onEdit={(newText, files) => handleEditMessage(index, newText, files)}
          />
        ))}
        {isLoading && currentMessage && (
          <Message 
            message={{ 
              text: currentMessage, 
              role: "assistant",
              files: []
            }} 
          />
        )}
        {messages.length === 0 && !isLoading && children}
        <div ref={messagesEndRef} />
      </div>
    );
  } catch (error) {
    console.error("Error en ChatMessages:", error);
    return (
      <div style={styles.container}>
        <div style={{ padding: "20px", textAlign: "center" }}>
          Error al cargar los mensajes
        </div>
      </div>
    );
  }
};

export default memo(ChatMessages);