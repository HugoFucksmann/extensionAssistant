import React, { useRef, useEffect, memo, useState, useLayoutEffect } from "react";
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { styles } from "./styles";
import { UserMessage } from "./Message/UserMessage";
import { AIMessage } from "./Message/AIMessage";
import { AgentMessage } from "./Message/AgentMessage";
import { useVSCodeContext } from "../../context/VSCodeContext";

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
      postMessage
    } = useVSCodeContext();

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