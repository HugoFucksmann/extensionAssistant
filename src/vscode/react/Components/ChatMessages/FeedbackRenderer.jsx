// FeedbackRenderer.jsx - Indicador único que cambia de estado
import React, { useState, memo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import StatusIndicator from './StatusIndicator';
import MarkdownContent from './MessageContent/MarkdownContent';

const FeedbackRenderer = memo(({ operationId, isActive = false }) => {
  const { feedbackMessages, theme, processingPhase } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('thinking');
  const [currentTitle, setCurrentTitle] = useState('Processing...');
  const [currentContent, setCurrentContent] = useState('');
  const [shouldRender, setShouldRender] = useState(false);

  // Process messages and determine if we should render anything
  useEffect(() => {
    if (!operationId) {
      setShouldRender(false);
      return;
    }

    const operationMessages = feedbackMessages[operationId] || [];
    if (operationMessages.length === 0 && !isActive) {
      setShouldRender(false);
      return;
    }

    setShouldRender(true);

    // Determine the current state based on messages
    const latestMessage = operationMessages[operationMessages.length - 1];
    const isCompleted = processingPhase === 'completed' || processingPhase === 'error';

    let status = 'thinking';
    let title = 'Processing...';
    let content = '';

    if (isCompleted) {
      status = processingPhase;
      title = processingPhase === 'completed' ? 'Processing completed' : 'Error occurred';
    } else if (latestMessage) {
      status = latestMessage.metadata?.status || 'thinking';
      content = latestMessage.content || '';

      switch (status) {
        case 'tool_executing':
          title = latestMessage.metadata?.toolName
            ? `Executing: ${latestMessage.metadata.toolName}...`
            : 'Executing tool...';
          break;
        case 'thinking':
          title = 'Thinking...';
          break;
        case 'success':
          title = 'Step completed';
          break;
        case 'error':
          title = 'Error occurred';
          break;
        default:
          title = 'Processing...';
      }
    }

    setCurrentStatus(status);
    setCurrentTitle(title);
    setCurrentContent(content);
  }, [operationId, feedbackMessages, processingPhase, isActive]);

  const containerStyle = {
    padding: theme.spacing.medium,
    margin: `${theme.spacing.medium} ${theme.spacing.large}`,
    borderRadius: theme.borderRadius.large,
    backgroundColor: theme.colors.glassBackground,
    border: `1px solid ${theme.colors.glassBorder}`,
    boxShadow: theme.shadows.medium,
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease', // Transición suave para cambios de estado
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: isCollapsed ? 0 : theme.spacing.medium,
    color: theme.colors.text,
    cursor: 'pointer',
  };

  const collapseButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: theme.colors.textMuted,
    fontSize: '12px',
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.small,
    transition: 'all 0.2s ease',
  };

  const contentStyle = {
    maxHeight: isCollapsed ? '0' : '300px',
    overflow: 'hidden',
    transition: 'max-height 0.3s ease',
  };

  const scrollableContentStyle = {
    maxHeight: '300px',
    overflowY: 'auto',
    paddingRight: theme.spacing.small,
  };

  // If we shouldn't render, return null
  if (!shouldRender) return null;

  // Get operation messages only after we've determined we should render
  const operationMessages = feedbackMessages[operationId] || [];

  return (
    <div className="message-fade-in" style={containerStyle}>
      <div style={headerStyle} onClick={() => setIsCollapsed(!isCollapsed)}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <StatusIndicator status={currentStatus} size="medium" />
          <span style={{ marginLeft: theme.spacing.small, fontWeight: '600' }}>
            {currentTitle}
          </span>
        </div>
        <button
          style={collapseButtonStyle}
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
        >
          {isCollapsed ? '▼' : '▲'}
        </button>
      </div>

      <div style={contentStyle}>
        <div style={scrollableContentStyle}>
          {/* Mostrar contenido actual */}
          {currentContent && (
            <div style={{
              padding: theme.spacing.medium,
              borderRadius: theme.borderRadius.medium,
              backgroundColor: theme.colors.feedbackThinkingBackground,
              marginBottom: theme.spacing.small,
            }}>
              <MarkdownContent content={currentContent} />
            </div>
          )}

          {/* Mostrar historial de pasos si hay múltiples mensajes */}
          {operationMessages.length > 1 && (
            <details style={{ marginTop: theme.spacing.medium }}>
              <summary style={{
                color: theme.colors.textMuted,
                fontSize: theme.typography.small,
                cursor: 'pointer',
                padding: theme.spacing.small,
              }}>
                View step history ({operationMessages.length} steps)
              </summary>
              <div style={{ marginTop: theme.spacing.small }}>
                {operationMessages.map((msg, index) => (
                  <FeedbackHistoryItem key={msg.id || `step-${index}`} message={msg} stepNumber={index + 1} />
                ))}
              </div>
            </details>
          )}

          {currentStatus === 'completed' && (
            <div style={{
              padding: theme.spacing.small,
              textAlign: 'center',
              color: theme.colors.textMuted,
              fontSize: theme.typography.small
            }}>
              ✅ All steps completed successfully.
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Componente para mostrar el historial de pasos
const FeedbackHistoryItem = memo(({ message, stepNumber }) => {
  const { theme } = useApp();
  const status = message.metadata?.status || "info";
  const content = message.content || message.text || "";

  const getStatusColors = (status) => {
    switch (status) {
      case "thinking":
      case "tool_executing":
        return {
          bg: theme.colors.feedbackThinkingBackground,
          border: theme.colors.statusThinking,
          text: theme.colors.feedbackThinkingText,
        };
      case "success":
        return {
          bg: theme.colors.feedbackSuccessBackground,
          border: theme.colors.statusSuccess,
          text: theme.colors.feedbackSuccessText,
        };
      case "error":
        return {
          bg: theme.colors.feedbackErrorBackground,
          border: theme.colors.statusError,
          text: theme.colors.feedbackErrorText,
        };
      default:
        return {
          bg: theme.colors.feedbackInfoBackground,
          border: theme.colors.statusInfo,
          text: theme.colors.feedbackInfoText,
        };
    }
  };

  const colors = getStatusColors(status);
  const itemStyle = {
    padding: `${theme.spacing.small} ${theme.spacing.medium}`,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.borderRadius.small,
    borderLeft: `2px solid ${colors.border}`,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: theme.typography.small,
    opacity: 0.8,
  };

  return (
    <div style={itemStyle}>
      <div style={{ fontWeight: '500', marginBottom: theme.spacing.xs }}>
        Step {stepNumber}: {message.metadata?.toolName || 'Processing'}
      </div>
      <MarkdownContent content={content} />
    </div>
  );
});

export default FeedbackRenderer;