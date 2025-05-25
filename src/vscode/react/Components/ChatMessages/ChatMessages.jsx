// ChatMessages.jsx - Main container
import React, { useRef, useLayoutEffect, memo } from "react";
import { useApp } from "../../context/AppContext";
import MessageRenderer from "./MessageRenderer";
import FeedbackRenderer from "./FeedbackRenderer";

const ChatMessages = ({ children }) => {
  const { theme, messages, activeFeedbackOperationId } = useApp();
  const messagesEndRef = useRef(null);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeFeedbackOperationId]);

  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    height: "100%",
    backgroundColor: theme.colors.background,
    overflow: "hidden",
  };

  const scrollableStyle = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    flex: 1,
    overflow: "auto",
    padding: `0 ${theme.spacing.small}`,
  };

  return (
    <div style={containerStyle}>
      <style>{`
        .message-fade-in {
          animation: messageFadeIn 0.3s ease-out forwards;
        }
        @keyframes messageFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chat-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .chat-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-scrollbar::-webkit-scrollbar-thumb {
          background-color: ${theme.colors.border};
          border-radius: 4px;
        }
        .chat-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: ${theme.colors.primary};
        }
      `}</style>
      
      <div className="chat-scrollbar" style={scrollableStyle}>
        {messages.map((message, index) => {
          // Render user message
          if (message.sender === "user") {
            return <MessageRenderer key={message.id || `${index}-${message.timestamp}`} message={message} messageIndex={index} />;
          }
          
          // Skip system messages that are part of active feedback
          if (message.sender === "system" && message.metadata?.operationId === activeFeedbackOperationId) {
            return null;
          }
          
          // Render assistant message with feedback before it
          if (message.sender === "assistant") {
            return (
              <React.Fragment key={message.id || `${index}-${message.timestamp}`}>
                <FeedbackRenderer operationId={message.metadata?.operationId} />
                <MessageRenderer message={message} messageIndex={index} />
              </React.Fragment>
            );
          }
          
          // Render historical system messages
          return <MessageRenderer key={message.id || `${index}-${message.timestamp}`} message={message} messageIndex={index} />;
        })}

        {/* Active feedback for current operation */}
        <FeedbackRenderer operationId={activeFeedbackOperationId} isActive={true} />
        
        <div ref={messagesEndRef} style={{ height: '1px' }} />
      </div>
    </div>
  );
};

export default memo(ChatMessages);