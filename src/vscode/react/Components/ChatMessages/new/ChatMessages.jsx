import React, { useEffect, useRef } from "react";
import MessageItem from "./MessageItem";
import "../styles/ChatMessages.css"; 
import { useApp } from "../../../context/AppContext";

const ChatMessages = () => {
  const { messages = [] } = useApp(); 
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Existing logic
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const displayableMessages = messages.filter(msg => {
    const phase = msg.metadata?.phase;
   
    if (phase && (msg.metadata?.status === 'phase_started' || msg.metadata?.status === 'phase_completed')) {
      return !!msg.metadata?.toolName; 
    }
    return true;
  });

  return (
    <div className="chat-messages">
      <div className="messages-container">
        {displayableMessages.map((message, index) => (
          <MessageItem key={message?.operationId || message?.id || `msg-${index}`} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatMessages;