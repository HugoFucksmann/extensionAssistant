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

          isActive: false
        };
        grouped.push(currentConversation);
      } else if (currentConversation) {

    
        if (message.sender === "assistant" && 
            (message.metadata?.isFinalResponse || 
             (!message.metadata?.toolName && !message.metadata?.status))) {
          currentConversation.assistantResponse = message;
        } else {
        
          if (message.metadata?.toolName || message.metadata?.status) {
            currentConversation.operationMessages.push(message);
          }
        }
      } else {
    
        grouped.push({
          id: `orphan-${message.id}`,
          userMessage: null,
          assistantResponse: message.sender === "assistant" ? message : null,
          operationMessages: message.sender !== "assistant" ? [message] : [],

          isActive: false
        });
      }
    });
  
    return grouped;
  };