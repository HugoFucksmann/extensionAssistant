import React, { useRef, useLayoutEffect, memo } from "react";
import { styles, combineStyles } from "./styles";
import { useApp } from "../../context/AppContext";
import FeedbackCard from "./FeedbackCard"; // Keep for rendering past feedback if needed, or remove if Message handles all
import StatusIndicator from "./StatusIndicator"; // Keep for rendering past feedback if needed
import UnifiedFeedbackDisplay from "./UnifiedFeedbackDisplay";
import MarkdownContent from './MessageContent/MarkdownContent';
// import CodeBlock from "./CodeBlock"; // If messages can be pure code blocks
// UserMessage component is separate, this Message is for assistant/system
// SystemMessage.jsx is deprecated for active feedback

const Message = memo(({ message, messageIndex }) => {
  const { theme, activeFeedbackOperationId } = useApp();

  // If this message is part of the currently active feedback operation,
  // UnifiedFeedbackDisplay will handle rendering it. So, skip here.
  if (
    message.sender === "system" &&
    message.metadata?.operationId &&
    message.metadata.operationId === activeFeedbackOperationId
  ) {
    return null;
  }

  const formattedMessage = {
    ...message,
    content: message.content || message.text || "", // Ensure content exists
    timestamp: message.timestamp || Date.now(),
    id: message.id || `msg_${Date.now()}_${messageIndex}`,
    metadata: message.metadata || {},
  };

  const isUserMessage = formattedMessage.sender === "user";
  const isSystemMessage = formattedMessage.sender === "system"; // Includes past feedback or general system errors

  if (isSystemMessage) {
    // Render general system messages or past feedback items from completed operations
    // This uses a simplified FeedbackCard-like appearance for history
    const systemMessageStyle = {
      ...styles.feedbackCard, // Base style from shared styles
      margin: `${theme.spacing.small} ${theme.spacing.large}`,
      padding: theme.spacing.medium,
      backgroundColor: formattedMessage.metadata?.status === 'error' ? theme.colors.feedbackErrorBackground : theme.colors.glassBackground,
      borderLeft: `3px solid ${
        formattedMessage.metadata?.status === 'error' ? theme.colors.statusError : 
        (formattedMessage.metadata?.status === 'success' ? theme.colors.statusSuccess : theme.colors.statusInfo)
      }`,
      color: formattedMessage.metadata?.status === 'error' ? theme.colors.feedbackErrorText : theme.colors.text,
      opacity: 0.9, // Slightly faded for history
    };

    return (
      <div style={systemMessageStyle} className="historical-system-message">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: theme.spacing.small }}>
          <StatusIndicator status={formattedMessage.metadata?.status || 'info'} size="small" />
          <span style={{ fontWeight: '500', marginLeft: theme.spacing.small }}>
            {formattedMessage.metadata?.toolName || formattedMessage.metadata?.status || 'System Message'}
          </span>
        </div>
        <MarkdownContent content={formattedMessage.content} />
        <div style={{ ...styles.messageTimestamp, fontSize: '10px', textAlign: 'right', marginTop: theme.spacing.small }}>
          {new Date(formattedMessage.timestamp).toLocaleTimeString()}
        </div>
      </div>
    );
  }

  // User and Assistant (final) messages
  const messageContainerStyle = combineStyles(
    styles.messageContainer, // Base structural style
    { // Theme-based overrides
      backgroundColor: isUserMessage ? theme.colors.messageUserBg : theme.colors.messageAssistantBg,
      color: theme.colors.text,
      borderColor: theme.colors.glassBorder, // Use glass border for consistency
      alignSelf: isUserMessage ? "flex-end" : "flex-start",
      maxWidth: "85%", // Keep max width
      margin: `${theme.spacing.small} ${theme.spacing.large}`, // Consistent margins
    }
  );
  
  const headerStyle = {
    ...styles.messageHeader, // Base
    color: isUserMessage ? theme.colors.primary : theme.colors.text, // User header colored by primary
    marginBottom: theme.spacing.small,
  };

  const timestampStyle = {
    ...styles.messageTimestamp, // Base
    color: theme.colors.textMuted || 'rgba(255, 255, 255, 0.5)', // Assuming textMuted in theme or fallback
    textAlign: isUserMessage ? "right" : "left",
    marginTop: theme.spacing.small,
  };

  return (
    <div className={`message-container ${isUserMessage ? 'user' : 'assistant'}`} style={messageContainerStyle}>
      <div style={headerStyle}>{isUserMessage ? "You" : "Assistant"}</div>
      
      <MarkdownContent content={formattedMessage.content} />

      {/* TODO: Integrate CodeBlock rendering if MarkdownContent doesn't handle it or if it's a specific message type */}
      {/* Example: if (formattedMessage.metadata?.code) { <CodeBlock ... /> } */}

      {formattedMessage.files?.length > 0 && (
        <div style={styles.attachedFilesImproved}>
          {formattedMessage.files.map((file, i) => (
            <div key={i} style={{...styles.fileTagImproved, backgroundColor: theme.colors.secondary, color: theme.colors.primary}}>
              📎 {typeof file === 'string' ? file : file.path}
            </div>
          ))}
        </div>
      )}
      <div style={timestampStyle}>{new Date(formattedMessage.timestamp).toLocaleTimeString()}</div>
    </div>
  );
});

const ChatMessages = ({ children }) => {
  const { theme, messages, isLoading, activeFeedbackOperationId } = useApp();
  const messagesEndRef = useRef(null);
  const scrollableContainerRef = useRef(null);

  useLayoutEffect(() => {
    if (messagesEndRef.current) {
      // Scroll to bottom, behavior "auto" if it's not user-initiated scroll
      // For new messages, "smooth" is good.
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, activeFeedbackOperationId]); // Scroll when new messages or feedback state changes

  const scrollbarStyles = {
    scrollbarWidth: 'thin',
    scrollbarColor: `${theme.colors.border} transparent`,
    '&::-webkit-scrollbar': {
      width: '8px', // Slightly thicker for main chat
      height: '8px'
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent' // Or theme.colors.background
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.colors.border,
      borderRadius: '4px',
      '&:hover': {
        backgroundColor: theme.colors.primary // Or a theme hover color
      }
    }
  };
  
  // Keyframes for fadeIn are defined in UnifiedFeedbackDisplay and App.jsx <style> tags
  // Or could be globally defined if needed.

  return (
    <div 
      style={{...styles.container, backgroundColor: theme.colors.background }} 
      ref={scrollableContainerRef}
    >
       <style>{`
        /* General message fade-in animation */
        .message-container.user, .message-container.assistant, .historical-system-message {
          animation: chatMessageFadeIn 0.3s ease-out forwards;
        }
        @keyframes chatMessageFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Main chat scrollbar */
        .chat-scrollable-container::-webkit-scrollbar {
          width: 8px;
        }
        .chat-scrollable-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-scrollable-container::-webkit-scrollbar-thumb {
          background-color: ${theme.colors.border};
          border-radius: 4px;
        }
        .chat-scrollable-container::-webkit-scrollbar-thumb:hover {
          background-color: ${theme.colors.primary};
        }
      `}</style>
      <div 
        className="chat-scrollable-container"
        style={combineStyles(styles.scrollableContainer, scrollbarStyles, {padding: `0 ${theme.spacing.small}`})}
      >
        {messages.map((message, index) => (
          <Message key={message.id || `${index}-${message.timestamp}`} message={message} messageIndex={index} />
        ))}

        <UnifiedFeedbackDisplay />

        {/* children is EmptyChatView, shown by App.jsx logic */}
        {/* {messages.length === 0 && !isLoading && !activeFeedbackOperationId && children} */}
        <div ref={messagesEndRef} style={{ height: '1px' }} />
      </div>
    </div>
  );
};

export default memo(ChatMessages);