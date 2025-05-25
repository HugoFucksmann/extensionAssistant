import React from 'react';
import { useApp } from '../../context/AppContext';
import FeedbackCard from './FeedbackCard';
import StatusIndicator from './StatusIndicator';
import { styles as commonStyles, combineStyles } from './styles'; // Assuming styles are in ChatMessages/styles.js

const UnifiedFeedbackDisplay = () => {
  const { activeFeedbackOperationId, feedbackMessages, theme, processingPhase } = useApp();

  if (!activeFeedbackOperationId) {
    return null; 
  }

  const currentOperationMessages = feedbackMessages[activeFeedbackOperationId] || [];
  
  // Determine overall status and title from the latest message in the operation or processingPhase
  const latestMessageInOperation = currentOperationMessages[currentOperationMessages.length - 1];
 

 // Si processingPhase es 'completed' o 'error' (establecido por ADD_MESSAGE para la respuesta final), úsalo.
  // Si no, usa el estado del último mensaje de feedback.
  const isOperationConsideredFinal = processingPhase === 'completed' || processingPhase === 'error';
  const currentStatus = isOperationConsideredFinal ? processingPhase: latestMessageInOperation?.metadata?.status || 'thinking';


  let title = "Operation Details";
  if (currentStatus === 'tool_executing') title = latestMessageInOperation?.metadata?.toolName ? `Executing: ${latestMessageInOperation.metadata.toolName}...` : "Executing tool...";
  else if (currentStatus === 'thinking') title = "Thinking...";
  else if (currentStatus === 'success' && currentOperationMessages.length > 0) title = "Processing step completed"; // Or more specific
  else if (currentStatus === 'error') title = "An error occurred during processing";
  else if (currentOperationMessages.length > 0) title = "Processing request..."; 

  const displayContainerStyle = {
    padding: theme.spacing.medium,
    margin: `${theme.spacing.medium} ${theme.spacing.large}`, // Give it some horizontal margin
    borderRadius: theme.borderRadius.large,
    backgroundColor: theme.colors.glassBackground,
    border: `1px solid ${theme.colors.glassBorder}`,
    boxShadow: theme.shadows.medium,
    backdropFilter: 'blur(10px)', // For glassmorphism if supported by theme/styles
    animation: `${commonStyles.animations?.fadeIn ? 'fadeIn' : 'none'} 0.3s ease-out`, // Use animation from styles.js
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing.medium,
    color: theme.colors.text,
    fontSize: theme.typography.large,
  };

  const feedbackItemsContainerStyle = {
    maxHeight: '250px', // Limit height and make scrollable
    overflowY: 'auto',
    paddingRight: theme.spacing.small, // For scrollbar spacing
    // Apply custom scrollbar styles from theme or commonStyles if available
    ...commonStyles.customScrollbar, // Assuming customScrollbar is defined in styles.js and compatible
    scrollbarWidth: 'thin',
    scrollbarColor: `${theme.colors.border} transparent`,
  };


  return (
    <div style={displayContainerStyle} className="unified-feedback-display">
      {/* ... style tag ... */}
      <div style={headerStyle}>
        <StatusIndicator status={currentStatus} size="medium" />
        <span style={{ marginLeft: theme.spacing.small, fontWeight: '600' }}>{title}</span>
      </div>
      <div style={feedbackItemsContainerStyle} className="unified-feedback-items-container">
        {currentOperationMessages.map(msg => (
          <FeedbackCard key={msg.id} message={msg} />
        ))}
        {/* Podrías añadir un mensaje explícito si está 'completed' y no hay más items */}
        {currentStatus === 'completed' && currentOperationMessages.length > 0 && (
          <div style={{padding: theme.spacing.small, textAlign: 'center', color: theme.colors.textMuted, fontSize: theme.typography.small}}>
            All steps finished.
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedFeedbackDisplay;