import React, { useState, useEffect } from "react";
import CodeBlock from "../MessageContent/CodeBlock";
import MarkdownContent from "../MessageContent/MarkdownContent";
import { styles } from "../styles";
import AttachedFiles from "../AttachedFiles";
import { useVSCodeContext } from "../../../context/VSCodeContext";


const parseMessage = (message) => {
  if (!message) return [{ type: "markdown", content: "" }];
  
  const parts = [];
  const codeRegex = /```([\w:\/\\.-]+)?\s*([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "markdown",
        content: message.slice(lastIndex, match.index),
      });
    }

    const [language, filename] = (match[1] || "javascript").split(":");

    parts.push({
      type: "code",
      language,
      filename: filename || undefined,
      content: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < message.length) {
    parts.push({ type: "markdown", content: message.slice(lastIndex) });
  }

  return parts;
};

// Estilos para los botones de confirmación
const confirmationStyles = {
  buttonsContainer: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
  },
  button: {
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    border: 'none',
    transition: 'background-color 0.2s',
  },
  applyButton: {
    backgroundColor: '#28a745',
    color: 'white',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
    color: 'white',
  }
};

export const AIMessage = ({ message }) => {
  const { postMessage, processingStatus } = useVSCodeContext();
  const [showConfirmButtons, setShowConfirmButtons] = useState(false);
  const [showToolDetails, setShowToolDetails] = useState(false);
  const parts = parseMessage(message?.text);
  const files = message?.files || [];

  // Determinar si este mensaje tiene herramientas ejecutadas asociadas
  const hasToolExecutions = message.metadata?.tools?.length > 0 || 
                           (message.metadata?.processingTime && message.metadata?.processingTime > 0);

  // Detectar si el mensaje contiene una solicitud de confirmación para aplicar cambios
  useEffect(() => {
    if (message?.text) {
      const hasConfirmationRequest = (
        message.text.includes("¿Deseas aplicar estos cambios?") ||
        message.text.includes("Responde con 'sí' para aplicar o 'no' para cancelar")
      );
      setShowConfirmButtons(hasConfirmationRequest);
    }
  }, [message?.text]);

  if (!message?.text) {
    return null;
  }

  // Manejar la confirmación o rechazo de cambios
  const handleConfirmation = (confirmed) => {
    postMessage('chat', {
      text: confirmed ? "sí" : "no",
      files: []
    });
  };

  return (
    <div style={{ ...styles.message, ...styles.aiMessage }}>
      {files.length > 0 && <AttachedFiles files={files} />}
      {parts.map((part, i) =>
        part.type === "code" ? (
          <CodeBlock
            key={i}
            language={part.language}
            filename={part.filename}
            content={part.content}
          />
        ) : (
          <MarkdownContent key={i} content={part.content} />
        )
      )}
      
      {/* Botones de confirmación para aplicar cambios */}
      {showConfirmButtons && (
        <div style={confirmationStyles.buttonsContainer}>
          <button 
            style={{...confirmationStyles.button, ...confirmationStyles.applyButton}}
            onClick={() => handleConfirmation(true)}
          >
            Aplicar cambios
          </button>
          <button 
            style={{...confirmationStyles.button, ...confirmationStyles.rejectButton}}
            onClick={() => handleConfirmation(false)}
          >
            Rechazar cambios
          </button>
        </div>
      )}
      
      {/* Información de herramientas ejecutadas */}
      {hasToolExecutions && (
        <div style={styles.toolsInfoContainer}>
          <div 
            style={styles.toolsInfoHeader}
            onClick={() => setShowToolDetails(!showToolDetails)}
          >
            <span style={styles.toolsInfoTitle}>
              {message.metadata?.processingTime ? 
                `Procesado en ${Math.round(message.metadata.processingTime / 100) / 10}s` : 
                'Herramientas ejecutadas'}
            </span>
            <span style={styles.toolsInfoToggle}>
              {showToolDetails ? '▼ Ocultar detalles' : '▶ Mostrar detalles'}
            </span>
          </div>
          
          {showToolDetails && message.metadata?.tools && (
            <div style={styles.toolsInfoContent}>
              <ToolExecutionList tools={message.metadata.tools} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};