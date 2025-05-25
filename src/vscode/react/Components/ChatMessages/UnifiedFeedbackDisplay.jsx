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
  const currentStatus = latestMessageInOperation?.metadata?.status || processingPhase || 'thinking';

  let title = "Processing request...";
  if (currentStatus === 'tool_executing') title = latestMessageInOperation?.metadata?.toolName ? `Executing: ${latestMessageInOperation.metadata.toolName}...` : "Executing tool...";
  else if (currentStatus === 'thinking') title = "Thinking...";
  else if (currentStatus === 'success' && currentOperationMessages.length > 0) title = "Processing step completed"; // Or more specific
  else if (currentStatus === 'error') title = "An error occurred during processing";


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
       <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .unified-feedback-display .feedback-card:hover { /* Specific hover for cards inside this display */
          background: ${theme.colors.glassBackgroundHover} !important;
          border-color: ${theme.colors.glassBorderHover} !important;
          transform: translateX(2px) !important;
        }
        /* Custom scrollbar for feedback items container */
        .unified-feedback-items-container::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .unified-feedback-items-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .unified-feedback-items-container::-webkit-scrollbar-thumb {
          background-color: ${theme.colors.border};
          border-radius: 3px;
        }
        .unified-feedback-items-container::-webkit-scrollbar-thumb:hover {
          background-color: ${theme.colors.primary}; /* Or a hover color from theme */
        }
      `}</style>
      <div style={headerStyle}>
        <StatusIndicator status={currentStatus} size="medium" />
        <span style={{ marginLeft: theme.spacing.small, fontWeight: '600' }}>{title}</span>
      </div>
      <div style={feedbackItemsContainerStyle} className="unified-feedback-items-container">
        {currentOperationMessages.map(msg => (
          <FeedbackCard key={msg.id} message={msg} />
        ))}
      </div>
    </div>
  );
};

export default UnifiedFeedbackDisplay;