// FeedbackRenderer.jsx - Collapsible feedback display
import React, { useState, memo } from 'react';
import { useApp } from '../../context/AppContext';
import StatusIndicator from './StatusIndicator';
import MarkdownContent from './MessageContent/MarkdownContent';

const FeedbackRenderer = memo(({ operationId, isActive = false }) => {
  const { feedbackMessages, theme, processingPhase } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!operationId) return null;

  const operationMessages = feedbackMessages[operationId] || [];
  if (operationMessages.length === 0 && !isActive) return null;

  const latestMessage = operationMessages[operationMessages.length - 1];
  const isCompleted = processingPhase === 'completed' || processingPhase === 'error';
  const currentStatus = isCompleted ? processingPhase : latestMessage?.metadata?.status || 'thinking';

  let title = "Processing...";
  if (currentStatus === 'tool_executing') {
    title = latestMessage?.metadata?.toolName ? `Executing: ${latestMessage.metadata.toolName}...` : "Executing tool...";
  } else if (currentStatus === 'thinking') {
    title = "Thinking...";
  } else if (currentStatus === 'success') {
    title = "Processing completed";
  } else if (currentStatus === 'error') {
    title = "Error occurred";
  }

  const containerStyle = {
    padding: theme.spacing.medium,
    margin: `${theme.spacing.medium} ${theme.spacing.large}`,
    borderRadius: theme.borderRadius.large,
    backgroundColor: theme.colors.glassBackground,
    border: `1px solid ${theme.colors.glassBorder}`,
    boxShadow: theme.shadows.medium,
    backdropFilter: 'blur(10px)',
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
    maxHeight: isCollapsed ? '0' : '250px',
    overflow: 'hidden',
    transition: 'max-height 0.3s ease',
  };

  const scrollableContentStyle = {
    maxHeight: '250px',
    overflowY: 'auto',
    paddingRight: theme.spacing.small,
  };

  return (
    <div className="message-fade-in" style={containerStyle}>
      <div style={headerStyle} onClick={() => setIsCollapsed(!isCollapsed)}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <StatusIndicator status={currentStatus} size="medium" />
          <span style={{ marginLeft: theme.spacing.small, fontWeight: '600' }}>
            {title}
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
          {operationMessages.map(msg => (
            <FeedbackItem key={msg.id} message={msg} />
          ))}
          {currentStatus === 'completed' && operationMessages.length > 0 && (
            <div style={{
              padding: theme.spacing.small,
              textAlign: 'center',
              color: theme.colors.textMuted,
              fontSize: theme.typography.small
            }}>
              All steps completed.
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const FeedbackItem = memo(({ message }) => {
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
    padding: `${theme.spacing.medium} ${theme.spacing.large}`,
    marginBottom: theme.spacing.small,
    borderRadius: theme.borderRadius.medium,
    borderLeft: `3px solid ${colors.border}`,
    backgroundColor: colors.bg,
    color: colors.text,
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing.medium,
  };

  return (
    <div style={itemStyle}>
      <StatusIndicator status={status} size="small" />
      <div style={{ flex: 1 }}>
        <MarkdownContent content={content} />
      </div>
    </div>
  );
});

export default FeedbackRenderer;