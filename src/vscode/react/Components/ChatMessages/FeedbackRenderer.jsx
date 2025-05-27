// FeedbackRenderer.jsx - Fixed version
import React, { useState, memo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import StatusIndicator from './StatusIndicator';
import MarkdownContent from './MessageContent/MarkdownContent';
import './FeedbackRenderer.css';

const FeedbackRenderer = memo(({ operationId, isActive = false }) => {
  const { feedbackMessages, theme, processingPhase, activeFeedbackOperationId } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('thinking');
  const [currentTitle, setCurrentTitle] = useState('Processing...');
  const [currentContent, setCurrentContent] = useState('');
  const [shouldRender, setShouldRender] = useState(false);

  // Solo estilos que dependen de estado dinámico
  const dynamicStyles = {
    container: {
      backgroundColor: theme.colors.glassBackground,
      border: `1px solid ${theme.colors.glassBorder}`
    },
    content: {
      maxHeight: isCollapsed ? '0' : '300px'
    }
  };

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

    // If this is not the active operation, collapse it and show completed state
    const isActiveOperation = operationId === activeFeedbackOperationId;
    if (!isActiveOperation && operationMessages.length > 0) {
      setIsCollapsed(true);
      setCurrentStatus('success');
      setCurrentTitle('Processing completed');
      setCurrentContent('');
      return;
    }

    // Determine the current state based on messages for active operation
    const latestMessage = operationMessages[operationMessages.length - 1];
    const isCompleted = processingPhase === 'completed' || processingPhase === 'error';

    let status = 'thinking';
    let title = 'Processing...';
    let content = '';

    if (isCompleted && isActiveOperation) {
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
  }, [operationId, feedbackMessages, processingPhase, isActive, activeFeedbackOperationId]);

  // If we shouldn't render, return null
  if (!shouldRender) return null;

  // Get operation messages only after we've determined we should render
  const operationMessages = feedbackMessages[operationId] || [];

  return (
    <div className="message-fade-in feedback-container" style={dynamicStyles.container}>
      <div className="feedback-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="feedback-header-content">
          <StatusIndicator status={currentStatus} size="medium" />
          <span className="feedback-title">
            {currentTitle}
          </span>
        </div>
        <button
          className="feedback-collapse-button"
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
        >
          {isCollapsed ? '▼' : '▲'}
        </button>
      </div>

      <div className="feedback-content" style={dynamicStyles.content}>
        <div className="feedback-scrollable">
          {operationMessages.length > 0 && (
            <div>
              {operationMessages.map((msg, index) => (
                <FeedbackHistoryItem key={msg.id || `step-${index}`} message={msg} stepNumber={index + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Component to show step history
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
    backgroundColor: colors.bg,
    color: colors.text,
    borderLeft: `2px solid ${colors.border}`
  };

  return (
    <div className="feedback-item" style={itemStyle}>
      <div className="feedback-item-title">
        Step {stepNumber}: {message.metadata?.toolName || 'Processing'}
      </div>
      <MarkdownContent content={content} />
    </div>
  );
});

export default FeedbackRenderer;