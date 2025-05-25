// MessageRenderer.jsx - Unified message rendering
import React, { memo } from "react";
import { useApp } from "../../context/AppContext";
import MarkdownContent from './MessageContent/MarkdownContent';
import StatusIndicator from "./StatusIndicator";

const MessageRenderer = memo(({ message, messageIndex, onEdit }) => {
  const { theme } = useApp();

  const formattedMessage = {
    ...message,
    content: message.content || message.text || "",
    timestamp: message.timestamp || Date.now(),
    id: message.id || `msg_${Date.now()}_${messageIndex}`,
    metadata: message.metadata || {},
  };

  const baseMessageStyle = {
    marginBottom: theme.spacing.large,
    padding: `${theme.spacing.medium} ${theme.spacing.large}`,
    borderRadius: theme.borderRadius.large,
    maxWidth: "85%",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    boxShadow: theme.shadows.small,
    border: `1px solid ${theme.colors.glassBorder}`,
    margin: `${theme.spacing.small} ${theme.spacing.large}`,
  };

  // System messages (historical feedback)
  if (formattedMessage.sender === "system") {
    const systemStyle = {
      ...baseMessageStyle,
      backgroundColor: formattedMessage.metadata?.status === 'error' 
        ? theme.colors.feedbackErrorBackground 
        : theme.colors.glassBackground,
      borderLeft: `3px solid ${
        formattedMessage.metadata?.status === 'error' ? theme.colors.statusError : 
        (formattedMessage.metadata?.status === 'success' ? theme.colors.statusSuccess : theme.colors.statusInfo)
      }`,
      color: formattedMessage.metadata?.status === 'error' 
        ? theme.colors.feedbackErrorText 
        : theme.colors.text,
      opacity: 0.9,
      alignSelf: "stretch",
      maxWidth: "none",
    };

    return (
      <div className="message-fade-in" style={systemStyle}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: theme.spacing.small }}>
          <StatusIndicator status={formattedMessage.metadata?.status || 'info'} size="small" />
          <span style={{ fontWeight: '500', marginLeft: theme.spacing.small }}>
            {formattedMessage.metadata?.toolName || 'System Message'}
          </span>
        </div>
        <MarkdownContent content={formattedMessage.content} />
        <div style={{ fontSize: '10px', textAlign: 'right', marginTop: theme.spacing.small, color: theme.colors.textMuted }}>
          {new Date(formattedMessage.timestamp).toLocaleTimeString()}
        </div>
      </div>
    );
  }

  // User and Assistant messages
  const isUserMessage = formattedMessage.sender === "user";
  const messageStyle = {
    ...baseMessageStyle,
    backgroundColor: isUserMessage ? theme.colors.messageUserBg : theme.colors.messageAssistantBg,
    color: theme.colors.text,
    alignSelf: isUserMessage ? "flex-end" : "flex-start",
  };

  const headerStyle = {
    fontWeight: "600",
    marginBottom: theme.spacing.small,
    fontSize: theme.typography.small,
    color: isUserMessage ? theme.colors.primary : theme.colors.text,
  };

  const timestampStyle = {
    fontSize: theme.typography.small,
    color: theme.colors.textMuted || 'rgba(255, 255, 255, 0.5)',
    textAlign: isUserMessage ? "right" : "left",
    marginTop: theme.spacing.small,
  };

  return (
    <div className={`message-fade-in ${isUserMessage ? 'user' : 'assistant'}`} style={messageStyle}>
      <div style={headerStyle}>
        {isUserMessage ? "You" : "Assistant"}
        {isUserMessage && onEdit && (
          <button
            onClick={() => onEdit(messageIndex)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              float: 'right',
              color: theme.colors.textMuted,
              padding: theme.spacing.xs
            }}
          >
            ✏️
          </button>
        )}
      </div>
      
      <MarkdownContent content={formattedMessage.content} />

      {formattedMessage.files?.length > 0 && (
        <div style={{ display: 'flex', gap: theme.spacing.small, flexWrap: 'wrap', marginTop: theme.spacing.medium }}>
          {formattedMessage.files.map((file, i) => (
            <div 
              key={i} 
              style={{
                fontSize: theme.typography.small,
                color: theme.colors.primary,
                padding: `${theme.spacing.xs} ${theme.spacing.small}`,
                backgroundColor: theme.colors.secondary,
                borderRadius: theme.borderRadius.small,
              }}
            >
              📎 {typeof file === 'string' ? file : file.path}
            </div>
          ))}
        </div>
      )}
      
      <div style={timestampStyle}>
        {new Date(formattedMessage.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
});

export default MessageRenderer;