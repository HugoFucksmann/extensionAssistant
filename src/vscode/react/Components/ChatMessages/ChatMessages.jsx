import React, { useRef, useEffect, memo, useState, useLayoutEffect } from "react";
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { styles } from "./styles";
import { useApp } from '../../context/AppContext';

const Message = memo(({ message, messageIndex, onEdit }) => {
  // Format message to ensure consistent structure
  const formattedMessage = {
    ...message,
    role: message.role || (message.sender || 'assistant'),
    text: message.text || message.content || message.message || '',
    files: Array.isArray(message.files) 
      ? message.files.map(file => typeof file === 'string' ? { path: file, content: undefined } : file)
      : [],
    timestamp: message.timestamp || Date.now(),
    id: message.id || `msg_${Date.now()}_${messageIndex}`,
    metadata: message.metadata || {},
    senderName: message.sender === 'user' ? 'You' : 
                message.sender === 'assistant' ? 'Assistant' : 
                message.sender === 'system' ? 'System' : message.sender
  };

  const messageStyle = {
    marginBottom: '16px',
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: formattedMessage.sender === 'user' 
      ? 'var(--vscode-textCodeBlock-background)' 
      : 'var(--vscode-editor-background)',
    border: `1px solid var(--vscode-panel-border)`,
    maxWidth: '90%',
    alignSelf: formattedMessage.sender === 'user' ? 'flex-end' : 'flex-start'
  };

  const headerStyle = {
    fontWeight: 'bold', 
    marginBottom: '4px',
    color: formattedMessage.sender === 'user' 
      ? 'var(--vscode-textLink-foreground)' 
      : 'var(--vscode-foreground)'
  };

  const timestampStyle = {
    fontSize: '11px', 
    color: 'var(--vscode-descriptionForeground)', 
    marginTop: '4px'
  };

  const contentStyle = {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  };

  return (
    <div style={messageStyle}>
      <div style={headerStyle}>
        {formattedMessage.senderName}
      </div>
      <div style={contentStyle}>
        {formattedMessage.text}
      </div>
      {formattedMessage.files?.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          {formattedMessage.files.map((file, i) => (
            <div key={i} style={{ fontSize: '12px', color: 'var(--vscode-textLink-foreground)' }}>
              📎 {file.path}
            </div>
          ))}
        </div>
      )}
      <div style={timestampStyle}>
        {new Date(formattedMessage.timestamp).toLocaleTimeString()}
      </div>
      {Object.keys(formattedMessage.metadata).length > 0 && (
        <details style={{ marginTop: '8px', fontSize: '12px' }}>
          <summary>Metadata</summary>
          <pre style={{ 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginTop: '4px',
            padding: '4px',
            backgroundColor: 'var(--vscode-input-background)',
            borderRadius: '4px'
          }}>
            {JSON.stringify(formattedMessage.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
});

const ChatMessages = ({ children }) => {
  try {
    console.log("Renderizando ChatMessages");
    const { 
      messages, 
      isLoading, 
      postMessage
    } = useApp();

    const messagesEndRef = useRef(null);
    const containerRef = useRef(null);
    const listRef = useRef(null);
    const [scrollToBottom, setScrollToBottom] = useState(true);
    const prevMessagesLengthRef = useRef(messages.length);
    
    // Efecto para manejar el auto-scroll cuando llegan nuevos mensajes
    useEffect(() => {
      // Solo hacer scroll automático si:
      // 1. Se agregó un nuevo mensaje (la longitud aumentó)
      // 2. scrollToBottom está activado (el usuario no ha scrolleado manualmente hacia arriba)
      if (messages.length > prevMessagesLengthRef.current && scrollToBottom) {
        if (listRef.current) {
          // Si estamos usando virtualización
          listRef.current.scrollToItem(messages.length - 1, 'end');
        } else if (messagesEndRef.current) {
          // Si estamos usando renderizado normal
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }
      
      prevMessagesLengthRef.current = messages.length;
    }, [messages, scrollToBottom]);
    
    // Función para detectar cuando el usuario hace scroll manualmente
    const handleScroll = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      // Si está cerca del final (menos de 100px del final), mantener auto-scroll
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setScrollToBottom(isNearBottom);
    };

    const handleEditMessage = (messageIndex, newText, files) => {
      const filePaths = files?.map(file => 
        typeof file === 'string' ? file : file.path
      ) || [];
      
      postMessage('chat', { text: newText, files: filePaths });
    };

    // Componente para renderizar cada elemento de la lista virtualizada
    const Row = ({ index, style, data }) => {
      const message = data[index];
      return (
        <div style={style}>
          <Message
            key={`${index}-${message.text}`}
            message={message}
            messageIndex={index}
            onEdit={(newText, files) => handleEditMessage(index, newText, files)}
          />
        </div>
      );
    };

    // Calcular la altura estimada de cada mensaje
    // Esto es una estimación, idealmente se ajustaría según el contenido real
    const getItemSize = (index) => {
      const message = messages[index];
      // Estimar altura basada en longitud del texto (muy simple)
      const baseHeight = 80; // Altura mínima
      const textLength = message?.text?.length || 0;
      return baseHeight + Math.min(300, textLength / 5); // Limitar altura máxima
    };

    return (
      <div style={styles.container} ref={containerRef}>
        {messages.length > 15 ? (
          // Usar virtualización para listas largas con AutoSizer para dimensiones automáticas
          <div style={styles.virtualListContainer} onScroll={handleScroll}>
            <AutoSizer>
              {({ height, width }) => (
                <List
                  ref={listRef}
                  height={height}
                  width={width}
                  itemCount={messages.length}
                  itemSize={getItemSize}
                  itemData={messages}
                  overscanCount={5} // Precargar más elementos para scroll suave
                  initialScrollOffset={0}
                >
                  {Row}
                </List>
              )}
            </AutoSizer>
          </div>
        ) : (
          // Renderizado normal para listas cortas
          <div style={styles.scrollableContainer} onScroll={handleScroll}>
            {messages.map((message, index) => (
              <Message
                key={`${index}-${message.text}`}
                message={message}
                messageIndex={index}
                onEdit={(newText, files) => handleEditMessage(index, newText, files)}
              />
            ))}
            {isLoading && (
              <Message 
                message={{ 
                  text: "Cargando...", 
                  role: "assistant",
                  files: []
                }} 
              />
            )}
            {messages.length === 0 && !isLoading && children}
            <div ref={messagesEndRef} />
          </div>
        )}
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