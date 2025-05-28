// src/vscode/react/Components/ChatMessages/AssistantResponse.jsx
import React, { memo } from "react";
import MarkdownContent from './MarkdownContent';

const AssistantResponse = memo(({ message, hasProcessingAbove }) => {
  const getMessageContent = (message) => {
    if (typeof message.content === 'string') {
      try {
        const parsed = JSON.parse(message.content);
        return parsed.contentPreview || parsed.message || message.content;
      } catch {
        return message.content;
      }
    }
    return message.content || message.text || "";
  };

  return (
    <div className={`message assistant-message ${hasProcessingAbove ? 'has-processing-above' : ''}`}>
      <div className="message-header">
        <span className="sender-name">Assistant</span>
        <span className="timestamp">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
      
      <div className="message-content">
        <MarkdownContent content={getMessageContent(message)} />
      </div>
    </div>
  );
});

export default AssistantResponse;