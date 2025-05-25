// src/vscode/react/Components/ChatMessages/ChatMessages.jsx

import React, { useRef, useEffect, memo, useState, useLayoutEffect } from "react";
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { styles } from "./styles"; // Asegúrate que esta ruta sea correcta
import { useApp } from '../../context/AppContext'; // Asegúrate que esta ruta sea correcta

// --- INICIO Iconos de ejemplo (puedes usar SVGs o una librería de íconos) ---
const IconInfo = () => <span style={styles.feedbackIcon}>ℹ️</span>;
const IconSuccess = () => <span style={styles.feedbackIcon}>✔️</span>;
const IconError = () => <span style={styles.feedbackIcon}>❌</span>;
const IconThinking = () => {
    // Un spinner simple o un emoji de pensamiento
    return <span style={{...styles.feedbackIcon, display: 'inline-block', animation: 'spin 1s linear infinite'}} >⚙️</span>;
};
// --- FIN Iconos de ejemplo ---


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
    // senderName ya no es necesario si usamos 'role' y estilizamos por 'role'
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

// El resto de ChatMessages.jsx (sin cambios en la lógica de virtualización, etc.)
const ChatMessages = ({ children }) => {
  try {
    // console.log("Renderizando ChatMessages"); // Puedes quitar este log si ya no es necesario
    const { 
      messages, 
      isLoading, 
      postMessage // postMessage se usa en handleEditMessage
    } = useApp();

    const messagesEndRef = useRef(null);
    const containerRef = useRef(null);
    const listRef = useRef(null);
    const [scrollToBottom, setScrollToBottom] = useState(true);
    const prevMessagesLengthRef = useRef(messages.length);
    
    useEffect(() => {
      if (messages.length > prevMessagesLengthRef.current && scrollToBottom) {
        if (listRef.current && messages.length > 15) { // Solo para lista virtualizada
          listRef.current.scrollToItem(messages.length - 1, 'end');
        } else if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' }); // 'auto' puede ser mejor para feedback rápido
        }
      }
      prevMessagesLengthRef.current = messages.length;
    }, [messages, scrollToBottom]);
    
    const handleScroll = (e) => {
      if (!e.currentTarget) return;
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150; // Aumentar umbral
      if (isNearBottom !== scrollToBottom) { // Solo actualizar si cambia
        setScrollToBottom(isNearBottom);
      }
    };

    const handleEditMessage = (messageIndex, newText, files) => {
      // Esta función es para editar mensajes de USUARIO, no de feedback.
      // El payload para 'chat' podría necesitar ser ajustado si tu backend espera un formato específico.
      // Actualmente, parece que 'chat' es un tipo de mensaje genérico.
      // Si 'chat' es solo para enviar nuevos mensajes, necesitarías un tipo diferente para editar.
      // Por ahora, asumimos que 'chat' puede manejar esto o que onEdit se usa de otra forma.
      const originalMessage = messages[messageIndex];
      postMessage('userMessageEdited', { // O un tipo de mensaje más específico
         originalMessageId: originalMessage.id,
         newText: newText,
         newFiles: files?.map(file => typeof file === 'string' ? file : file.path) || []
      });
      // Aquí, el backend debería procesar la edición y enviar un estado actualizado de los mensajes.
      // La UI no debería modificar directamente `messages` aquí.
    };

    const Row = ({ index, style: rowStyle, data }) => { // 'style' aquí es el de react-window
      const message = data[index];
      return (
        <div style={rowStyle}> {/* Este div es importante para react-window */}
          <Message
            // key ya no es necesario aquí si Message es el único hijo directo y react-window maneja keys
            message={message}
            messageIndex={index}
            onEdit={(newText, files) => handleEditMessage(index, newText, files)}
          />
        </div>
      );
    };

    const getItemSize = (index) => {
      const message = messages[index];
      if (!message) return 80; // Altura por defecto si el mensaje no existe

      const baseHeight = message.sender === 'system' ? 40 : 70; // Mensajes de feedback más cortos
      const textLength = message?.text?.length || 0;
      const fileHeight = (message.files?.length || 0) * 15;
      const metadataHeight = message.metadata && Object.keys(message.metadata).length > 0 && message.sender !== 'system' ? 50 : 0;
      
      // Estimación simple:
      let estimatedTextHeight = Math.ceil(textLength / 50) * 20; // 50 caracteres por línea, 20px por línea
      if (message.text && message.text.includes('\n')) { // Contar saltos de línea
          estimatedTextHeight += message.text.split('\n').length * 10;
      }
      
      return baseHeight + Math.min(250, estimatedTextHeight) + fileHeight + metadataHeight;
    };
    
    // CSS para la animación de spin (puedes ponerlo en un <style> en el index.html o un archivo CSS global)
    // Si no, puedes usar una librería de spinners o un SVG animado.
    const spinAnimation = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
    
    return (
      <div style={styles.container} ref={containerRef}>
        <style>{spinAnimation}</style> {/* Añadir la animación de spin */}
        {messages.length > 15 ? ( // Umbral para virtualización
          <div style={styles.virtualListContainer} onScroll={handleScroll}>
            <AutoSizer>
              {({ height, width }) => (
                <List
                  ref={listRef}
                  height={height}
                  width={width}
                  itemCount={messages.length}
                  itemSize={getItemSize}
                  itemData={messages} // Pasar messages como itemData
                  overscanCount={5}
                >
                  {Row}
                </List>
              )}
            </AutoSizer>
          </div>
        ) : (
          <div style={styles.scrollableContainer} onScroll={handleScroll}>
            {messages.map((message, index) => (
              <Message
                key={message.id || `${index}-${message.timestamp}`} // Usar un ID estable
                message={message}
                messageIndex={index}
                onEdit={(newText, files) => handleEditMessage(index, newText, files)}
              />
            ))}
            {/* El mensaje de "Cargando..." ahora se maneja por los mensajes de feedback con status 'thinking' */}
            {/* {isLoading && ( <Message message={{ text: "Cargando...", role: "assistant", files: []}} /> )} */}
            {messages.length === 0 && !isLoading && children /* Para EmptyChatView */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("Error en ChatMessages:", error);
    return (
      <div style={styles.container}>
        <div style={{ padding: "20px", textAlign: "center", color: 'var(--vscode-errorForeground)' }}>
          Error al cargar los mensajes.
        </div>
      </div>
    );
  }
};

export default memo(ChatMessages);