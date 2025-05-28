// src/vscode/react/Components/ChatMessages/ChatMessages.jsx
import React, { useRef, useLayoutEffect, memo, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import ConversationItem from "./components/ConversationItem";
import { groupMessagesIntoConversations } from "./utils/messageGrouping";
import "./ChatMessages.css";


const ChatMessages = () => {
  const { messages, activeFeedbackOperationId } = useApp();
  const messagesEndRef = useRef(null);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const conversations = useMemo(() => {
    return groupMessagesIntoConversations(messages, activeFeedbackOperationId);
  }, [messages, activeFeedbackOperationId]);

  return (
    <div className="chat-messages-container">
      <div className="chat-messages-scrollable">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default memo(ChatMessages);