// src/vscode/react/Components/ChatMessages/utils/messageGrouping.js

export const groupMessagesIntoConversations = (messages, activeFeedbackOperationId) => {
    const grouped = [];
    let currentConversation = null;
  
    messages.forEach((message) => {
      if (message.sender === "user") {
        currentConversation = {
          id: message.id || `conv-${Date.now()}`,
          userMessage: message,
          assistantResponse: null,
          operationMessages: [],
          operationId: null,
          isActive: false
        };
        grouped.push(currentConversation);
      } else if (currentConversation) {
        const opId = message.metadata?.operationId;
        
        if (opId && !currentConversation.operationId) {
          currentConversation.operationId = opId;
          currentConversation.isActive = opId === activeFeedbackOperationId;
        }
  
        // Separate final response from processing messages
        if (message.sender === "assistant" && 
            (message.metadata?.isFinalResponse || 
             (!message.metadata?.toolName && !message.metadata?.status))) {
          currentConversation.assistantResponse = message;
        } else {
          // Only add to operationMessages if it has tool/status metadata
          if (message.metadata?.toolName || message.metadata?.status) {
            currentConversation.operationMessages.push(message);
          }
        }
      } else {
        // Handle orphaned messages
        grouped.push({
          id: `orphan-${message.id}`,
          userMessage: null,
          assistantResponse: message.sender === "assistant" ? message : null,
          operationMessages: message.sender !== "assistant" ? [message] : [],
          operationId: message.metadata?.operationId || null,
          isActive: false
        });
      }
    });
  
    return grouped;
  };