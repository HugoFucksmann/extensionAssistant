// src/vscode/react/Components/ChatMessages/ChatMessages.jsx

import React, { useRef, useEffect, memo, useLayoutEffect } from "react";
import { styles } from "./styles";
import { useApp } from '../../context/AppContext';
import FeedbackAccordion from './FeedbackAccordion';

// --- INICIO Iconos de ejemplo (puedes usar SVGs o una librería de íconos) ---
const IconInfo = () => <span style={styles.feedbackIcon}>ℹ️</span>;
const IconSuccess = () => <span style={styles.feedbackIcon}>✔️</span>;
const IconError = () => <span style={styles.feedbackIcon}>❌</span>;
const IconThinking = () => {
    // Un spinner simple o un emoji de pensamiento
    return <span style={{...styles.feedbackIcon, display: 'inline-block', animation: 'spin 1s linear infinite'}} >⚙️</span>;
};

const Message = memo(({ message, messageIndex, onEdit }) => {
  const { theme } = useApp(); // Obtener el tema desde el contexto

  // Format message to ensure consistent structure
  const formattedMessage = {
    ...message,
    role: message.role || (message.sender || 'assistant'), // 'role' es más estándar que 'sender' para LLMs
    text: message.text || message.content || message.message || '',
    files: Array.isArray(message.files) 
      ? message.files.map(file => typeof file === 'string' ? { path: file, content: undefined } : file)
      : [],
    timestamp: message.timestamp || Date.now(),
    id: message.id || `msg_${Date.now()}_${messageIndex}`,
    metadata: message.metadata || {},
  };

  const isUserMessage = formattedMessage.sender === 'user';
  // Un mensaje de feedback es de 'system' y tiene un 'status' en metadata
  const isFeedbackMessage = formattedMessage.sender === 'system' && formattedMessage.metadata?.status;

  let messageContainerStyle = {
    marginBottom: theme.spacing.medium,
    padding: theme.spacing.medium,
    borderRadius: theme.borderRadius.medium,
    maxWidth: '90%',
    alignSelf: isUserMessage ? 'flex-end' : 'flex-start',
    // Estilos base para mensajes normales
    backgroundColor: isUserMessage ? theme.colors.messageUserBg : theme.colors.messageAssistantBg,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.border}`,
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  };

  let FeedbackIconComponent = null;

  if (isFeedbackMessage) {
    // Aplicar estilos base de feedback
    messageContainerStyle = {
      ...styles.feedbackMessage, // Aplicar el estilo base de styles.js
    };

    // Aplicar colores y bordes específicos del tema según el status
    switch (formattedMessage.metadata.status) {
      case 'info':
        messageContainerStyle.color = theme.colors.feedbackInfoText;
        messageContainerStyle.borderColor = theme.colors.feedbackInfoBorder;
        messageContainerStyle.backgroundColor = theme.colors.feedbackInfoBackground;
        FeedbackIconComponent = IconInfo;
        break;
      case 'success':
        messageContainerStyle.color = theme.colors.feedbackSuccessText;
        messageContainerStyle.borderColor = theme.colors.feedbackSuccessBorder;
        messageContainerStyle.backgroundColor = theme.colors.feedbackSuccessBackground;
        FeedbackIconComponent = IconSuccess;
        break;
      case 'error':
        messageContainerStyle.color = theme.colors.feedbackErrorText;
        messageContainerStyle.borderColor = theme.colors.feedbackErrorBorder;
        messageContainerStyle.backgroundColor = theme.colors.feedbackErrorBackground;
        FeedbackIconComponent = IconError;
        break;
      case 'thinking':
      case 'tool_executing':
        messageContainerStyle.color = theme.colors.feedbackThinkingText;
        messageContainerStyle.borderColor = theme.colors.feedbackThinkingBorder;
        messageContainerStyle.backgroundColor = theme.colors.feedbackThinkingBackground;
        FeedbackIconComponent = IconThinking;
        break;
      default:
        // Un fallback por si acaso, aunque no debería ocurrir
        messageContainerStyle.color = theme.colors.text;
        messageContainerStyle.borderColor = theme.colors.border;
        messageContainerStyle.backgroundColor = theme.colors.background;
    }
  } else if (isUserMessage) {
    // Estilos específicos para mensajes de usuario (ya los tenías)
    // messageContainerStyle.backgroundColor = theme.colors.messageUserBg; // Ya está arriba
  } else { // Mensajes del asistente (no feedback)
    // messageContainerStyle.backgroundColor = theme.colors.messageAssistantBg; // Ya está arriba
  }
  
  // Estilos para el header y timestamp (puedes ajustarlos si es necesario para feedback)
  const headerStyle = {
    fontWeight: 'bold', 
    marginBottom: '4px',
    // Color del header podría variar si es feedback vs. user/assistant
    color: isFeedbackMessage ? messageContainerStyle.color : (isUserMessage ? theme.colors.primary : theme.colors.text)
  };

  const timestampStyle = {
    fontSize: '11px', 
    color: theme.colors.text, // O un color más tenue: 'var(--vscode-descriptionForeground)'
    marginTop: '4px',
    opacity: 0.7,
  };

  return (
    <div style={messageContainerStyle}>
      {/* No mostrar header para mensajes de feedback, o un header diferente */}
      {!isFeedbackMessage && (
        <div style={headerStyle}>
          {isUserMessage ? 'You' : 'Assistant'}
        </div>
      )}

      <div>
        {FeedbackIconComponent && <FeedbackIconComponent />}
        {formattedMessage.text}
      </div>

      {/* Mostrar archivos adjuntos si no es un mensaje de feedback */}
      {!isFeedbackMessage && formattedMessage.files?.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          {formattedMessage.files.map((file, i) => (
            <div key={i} style={{ fontSize: '12px', color: 'var(--vscode-textLink-foreground)' }}>
              📎 {file.path}
            </div>
          ))}
        </div>
      )}
      
      {/* Mostrar timestamp para todos, o solo para no-feedback */}
      <div style={timestampStyle}>
        {new Date(formattedMessage.timestamp).toLocaleTimeString()}
      </div>

      {/* Mostrar metadata si existe y no es un mensaje de feedback (o si quieres mostrarla para feedback también) */}
      {!isFeedbackMessage && Object.keys(formattedMessage.metadata).length > 0 && (
        <details style={{ marginTop: '8px', fontSize: '12px' }}>
          <summary>Metadata</summary>
          <pre style={{ 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginTop: '4px',
            padding: '4px',
            backgroundColor: 'var(--vscode-input-background)', // Usar colores de VS Code
            borderRadius: '4px',
            color: 'var(--vscode-editor-foreground)',
            border: '1px solid var(--vscode-editorWidget-border)'
          }}>
            {JSON.stringify(formattedMessage.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
});

const ChatMessages = ({ children }) => {
  const { messages, isLoading, activeFeedbackOperationId, feedbackMessages } = useApp();
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Solo mensajes de user y assistant
  const regularMessages = messages.filter(msg => msg.sender === 'user' || msg.sender === 'assistant');

  // Scroll automático al final
  useLayoutEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [regularMessages.length, activeFeedbackOperationId]);

  // Scroll manual (por si se quiere manejar scroll en el futuro)
  const handleScroll = () => {};

  return (
    <div style={styles.container} ref={containerRef}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={styles.scrollableContainer} onScroll={handleScroll}>
        {regularMessages.map((message, index) => (
          <Message
            key={message.id || `${index}-${message.timestamp}`}
            message={message}
            messageIndex={index}
          />
        ))}

        {/* Renderizar FeedbackAccordion si hay feedback activo */}
        {activeFeedbackOperationId && feedbackMessages[activeFeedbackOperationId] && (
          <FeedbackAccordion
            operationId={activeFeedbackOperationId}
            initialMessages={feedbackMessages[activeFeedbackOperationId]}
          />
        )}

        {messages.length === 0 && !isLoading && children}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default memo(ChatMessages);