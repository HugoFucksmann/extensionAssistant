import React from "react";
import { styles, combineStyles } from "./styles"; // Assuming styles are in ChatMessages/styles.js
import { useApp } from "../../context/AppContext";
import StatusIndicator from "./StatusIndicator";
import MarkdownContent from "./MessageContent/MarkdownContent";


const FeedbackCard = ({ message }) => {
  const { theme } = useApp();
  const status = message.metadata?.status || "info";
  const content = message.content || message.text || "";

  let cardStyle = {
    ...styles.feedbackCard, // Base structural style from styles.js
    // Theme-based overrides:
    backgroundColor: theme.colors.feedbackInfoBackground, // Default
    borderLeftColor: theme.colors.statusInfo, // Default
    color: theme.colors.feedbackInfoText, // Default
    // Ensure other structural properties from styles.feedbackCard are preserved if not overridden by theme
    marginBottom: theme.spacing.small, // Consistent spacing
  };

  switch (status) {
    case "thinking":
    case "tool_executing":
      cardStyle.backgroundColor = theme.colors.feedbackThinkingBackground;
      cardStyle.borderLeftColor = theme.colors.statusThinking;
      cardStyle.color = theme.colors.feedbackThinkingText;
      break;
    case "success":
      cardStyle.backgroundColor = theme.colors.feedbackSuccessBackground;
      cardStyle.borderLeftColor = theme.colors.statusSuccess;
      cardStyle.color = theme.colors.feedbackSuccessText;
      break;
    case "error":
      cardStyle.backgroundColor = theme.colors.feedbackErrorBackground;
      cardStyle.borderLeftColor = theme.colors.statusError;
      cardStyle.color = theme.colors.feedbackErrorText;
      break;
    // 'info' case is covered by defaults
  }

  return (
    <div className="feedback-card" style={cardStyle}> {/* className for hover from parent's <style> tag */}
      <div style={styles.feedbackCardContent}> {/* feedbackCardContent from styles.js */}
        <StatusIndicator status={status} size="small" />
        {/* Using MarkdownContent for rich text, fallback to simple span if not complex */}
        <div style={{...styles.feedbackCardText, flex: 1}}>
            <MarkdownContent content={content} />
        </div>
      </div>
    </div>
  );
};

export default FeedbackCard;