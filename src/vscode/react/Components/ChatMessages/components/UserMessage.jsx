// src/vscode/react/Components/ChatMessages/UserMessage.jsx
import React, { memo } from "react";
import MarkdownContent from './MarkdownContent';
import FileAttachments from "./FileAttachments";

const UserMessage = memo(({ message }) => {
  return (
    <div className="message user-message">
      <div className="message-header">
        <span className="sender-name">You</span>
        <span className="timestamp">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
      
      <div className="message-content">
        <MarkdownContent content={message.content || message.text || ""} />
        {message.files?.length > 0 && (
          <FileAttachments files={message.files} />
        )}
      </div>
    </div>
  );
});

export default UserMessage;