// src/vscode/react/Components/ChatMessages/ConversationItem.jsx
import React, { memo, useState, useEffect } from "react";
import UserMessage from "./UserMessage";
import AssistantResponse from "./AssistantResponse";
import ProcessingSteps from "./ProcessingSteps";

const ConversationItem = memo(({ conversation }) => {
  const { userMessage, assistantResponse, operationMessages, isActive } = conversation;
  const [showSteps, setShowSteps] = useState(isActive);

  const hasProcessing = operationMessages.length > 0;
  const isCompleted = assistantResponse && !isActive;

  // Auto-close processing steps when response arrives
  useEffect(() => {
    if (isCompleted && showSteps) {
      const timer = setTimeout(() => {
        setShowSteps(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, showSteps]);

  return (
    <div className="conversation-item">
      {userMessage && <UserMessage message={userMessage} />}
      
      {hasProcessing && (
        <ProcessingSteps
          messages={operationMessages}
          isActive={isActive}
          isCollapsed={!showSteps}
          onToggle={() => setShowSteps(!showSteps)}
          isCompleted={isCompleted}
        />
      )}
      
      {assistantResponse && (
        <AssistantResponse 
          message={assistantResponse} 
          hasProcessingAbove={hasProcessing}
        />
      )}
    </div>
  );
});

export default ConversationItem;