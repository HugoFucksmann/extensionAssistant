// ChatMessages.jsx - Main container
import React, { useRef, useLayoutEffect, memo } from "react";
import { useApp } from "../../context/AppContext";
import MessageRenderer from "./MessageRenderer";
import FeedbackRenderer from "./FeedbackRenderer";
import "./ChatMessages.css";

const ChatMessages = ({ children }) => {
  const { theme, messages, activeFeedbackOperationId } = useApp();
  const messagesEndRef = useRef(null);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeFeedbackOperationId]);

  return (
    <div className="chat-messages-container">
      <div className="chat-scrollbar chat-messages-scrollable">
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