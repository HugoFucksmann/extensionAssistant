// src/vscode/react/Components/ChatMessages/ProcessingStep.jsx (Implementación)
import React, { memo } from "react";
import { useApp } from '../../../context/AppContext';
import MarkdownContent from '../MessageContent/MarkdownContent';
import StatusIndicator from '../StatusIndicator';
// Elige qué CSS base usar:
import '../FeedbackRenderer.css'; // Si quieres que se parezca a feedback-item
// O import "../MessageRenderer.css"; // Si quieres que se parezca a message-system

const ProcessingStep = memo(({ message }) => {
  const { theme } = useApp();

  if (!message) return null;

  const formattedMessage = {
    ...message,
    content: message.content || message.text || "",
    timestamp: message.timestamp || Date.now(),
    metadata: message.metadata || {},
  };

  const status = formattedMessage.metadata.status || (formattedMessage.sender === 'assistant' ? 'success' : 'info');
  const toolName = formattedMessage.metadata.toolName;
  const title = formattedMessage.sender === 'assistant'
    ? "AI Update"
    : toolName || (status === 'thinking' ? "Thinking..." : "Processing Step");

  // Estilos para el contenedor del paso (basado en feedback-item)
  const stepStyle = {
    // backgroundColor: ..., // Se definirá por clases o theme
    // borderLeft: ..., // Se definirá por clases o theme
    // color: ..., // Se definirá por clases o theme
    padding: 'var(--spacing-small) var(--spacing-medium)',
    marginBottom: 'var(--spacing-small)', // Espacio entre pasos
    borderRadius: 'var(--border-radius-medium)', // O small
    position: 'relative', // Para la línea de tiempo si se añade
    // marginLeft: 'var(--spacing-medium)', // Si hay línea de tiempo a la izquierda
  };

  // Clases dinámicas para el estilo del item (similar a FeedbackHistoryItem)
  let itemClass = "feedback-item"; // Clase base de FeedbackRenderer.css
  if (status === "thinking" || status === "tool_executing") {
    itemClass += " feedback-item-thinking"; // Necesitarás definir estas clases en FeedbackRenderer.css
  } else if (status === "success") {
    itemClass += " feedback-item-success";
  } else if (status === "error") {
    itemClass += " feedback-item-error";
  } else {
    itemClass += " feedback-item-info";
  }
  // Si el sender es assistant, podrías querer un estilo diferente
  if (formattedMessage.sender === 'assistant') {
    itemClass += " feedback-item-assistant"; // Clase adicional para asistentes
  }


  // Define estas clases en FeedbackRenderer.css o tu CSS global
  // .feedback-item-thinking { background-color: var(--feedback-thinking-background); border-left-color: var(--status-thinking); color: var(--feedback-thinking-text); }
  // .feedback-item-success { background-color: var(--feedback-success-background); border-left-color: var(--status-success); color: var(--feedback-success-text); }
  // .feedback-item-error { background-color: var(--feedback-error-background); border-left-color: var(--status-error); color: var(--feedback-error-text); }
  // .feedback-item-info { background-color: var(--feedback-info-background); border-left-color: var(--status-info); color: var(--feedback-info-text); }
  // .feedback-item-assistant { border-left-color: var(--primary); /* o un color específico para asistente */ }


  return (
    <div className={`${itemClass} message-fade-in`} style={stepStyle}>
      {/* Contenedor para el header del paso (icono, título, timestamp) */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-xs)' }}>
        <StatusIndicator status={status} size="small" />
        <span style={{ fontWeight: 500, marginLeft: 'var(--spacing-xs)', flexGrow: 1 }}>
          {title}
        </span>
        <span style={{ fontSize: 'var(--typography-xs)', color: theme.colors.textMuted, whiteSpace: 'nowrap' }}>
          {new Date(formattedMessage.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Contenido del mensaje del paso, solo si hay contenido */}
      {formattedMessage.content && formattedMessage.content.trim() !== "" && (
        <div style={{ fontSize: 'var(--typography-small)', opacity: 0.9 }}>
          <MarkdownContent content={formattedMessage.content} />
        </div>
      )}

      {/* Mostrar Tool Output si existe (ejemplo básico) */}
      {formattedMessage.metadata.toolOutput && (
        <details style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--typography-xs)' }}>
          <summary style={{ cursor: 'pointer', color: theme.colors.textMuted }}>
            Tool Output
          </summary>
          <pre style={{
            backgroundColor: theme.colors.codeBlockBg || 'var(--code-block-bg)',
            padding: 'var(--spacing-small)',
            borderRadius: 'var(--border-radius-small)',
            overflowX: 'auto',
            color: theme.colors.codeBlockText || 'var(--code-block-text)',
          }}>
            {typeof formattedMessage.metadata.toolOutput === 'string'
              ? formattedMessage.metadata.toolOutput
              : JSON.stringify(formattedMessage.metadata.toolOutput, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
});
ProcessingStep.displayName = "ProcessingStep";
export default ProcessingStep;