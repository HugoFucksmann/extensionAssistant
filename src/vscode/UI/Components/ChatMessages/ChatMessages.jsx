import React, { useEffect, useRef } from "react";
import MessageItem from "./MessageItem";
import "./styles/ChatMessages.css"; 
import { useApp } from "../../context/AppContext";

const ChatMessages = () => {
  const { messages = [] } = useApp(); 
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filter messages for display
  const displayableMessages = messages.filter(msg => {
    const { phase, status, toolName } = msg.metadata || {};
    
    // Show phase messages only if they have a tool name
    if (phase && (status === 'phase_started' || status === 'phase_completed')) {
      return !!toolName;
    }
    return true;
  });

  return (
    <div className="chat-messages">
      <div className="messages-container">
        {displayableMessages.map((message, index) => (
          <MessageItem 
            key={message?.operationId || message?.id || `msg-${index}`} 
            message={message} 
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatMessages;