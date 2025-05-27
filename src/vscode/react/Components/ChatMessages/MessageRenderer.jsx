// MessageRenderer.jsx
import React, { memo } from "react";
import { useApp } from "../../context/AppContext";
import MarkdownContent from './MessageContent/MarkdownContent';
import StatusIndicator from "./StatusIndicator";
import "./MessageRenderer.css";

const MessageRenderer = memo(({ message, messageIndex }) => {
  const { theme } = useApp();

  const formattedMessage = {
    ...message,
    content: message.content || message.text || "",
    timestamp: message.timestamp || Date.now(),
    id: message.id || `msg_${Date.now()}_${messageIndex}`,
    metadata: message.metadata || {},
  };

  // Variables CSS dinámicas específicas
  const cssVariables = {
    // Estas variables ya están definidas en theme.js
    // Se mantiene solo para compatibilidad durante la transición
  };

  if (formattedMessage.sender === "system") {
    const systemStyle = {
      ...cssVariables,
      backgroundColor: formattedMessage.metadata?.status === 'error' 
        ? theme.colors.feedbackErrorBackground 
        : theme.colors.glassBackground,
      borderLeft: `3px solid ${formattedMessage.metadata?.status === 'error' ? 
        theme.colors.statusError : 
        (formattedMessage.metadata?.status === 'success' ? 
          theme.colors.statusSuccess : 
          theme.colors.statusInfo)}`,
      color: formattedMessage.metadata?.status === 'error' 
        ? theme.colors.feedbackErrorText 
        : theme.colors.text
    };

    return (
      <div className="message-fade-in message-base message-system" style={systemStyle}>
        <div className="message-status-indicator">
          <StatusIndicator status={formattedMessage.metadata?.status || 'info'} size="small" />
          <span className="message-tool-name">
            {formattedMessage.metadata?.toolName || 'System Message'}
          </span>
        </div>
        <MarkdownContent content={formattedMessage.content} />
        <div className="message-timestamp">
          {new Date(formattedMessage.timestamp).toLocaleTimeString()}
        </div>
      </div>
    );
  }

  const isUserMessage = formattedMessage.sender === "user";
  
  return (
    <div 
      className={`message-container ${isUserMessage ? 'message-container-user' : 'message-container-assistant'}`}
      style={cssVariables}
    >
      <div className={`message-header ${isUserMessage ? 'user' : 'assistant'}`}>
        {isUserMessage ? "You" : "Assistant"}
      </div>
      
      <MarkdownContent content={formattedMessage.content} />

      {formattedMessage.files?.length > 0 && (
        <div className="message-files">
          {formattedMessage.files.map((file, i) => (
            <div key={i} className="message-file">
              {typeof file === 'string' ? file : file.path}
            </div>
          ))}
        </div>
      )}
      
      <div className={`message-timestamp ${isUserMessage ? 'user' : 'assistant'}`}>
        {new Date(formattedMessage.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
});

export default MessageRenderer;