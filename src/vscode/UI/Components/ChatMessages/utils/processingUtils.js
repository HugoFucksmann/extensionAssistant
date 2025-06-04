// src/vscode/react/Components/ChatMessages/utils/processingUtils.js

export const groupProcessingSteps = (messages) => {
    const steps = [];
    let currentTool = null;
    
    messages.forEach((msg) => {
      const toolName = msg.metadata?.toolName;
      const status = msg.metadata?.status;
      
      if (toolName && toolName !== currentTool?.name) {
        // New tool
        currentTool = {
          name: toolName,
          status: status,
          messages: [msg],
          startTime: msg.timestamp,
          endTime: msg.timestamp
        };
        steps.push(currentTool);
      } else if (currentTool && toolName === currentTool.name) {
        // Update existing tool
        currentTool.messages.push(msg);
        currentTool.status = status; // Latest status
        currentTool.endTime = msg.timestamp;
      } else if (!toolName) {
        // Thinking message without tool
        steps.push({
          name: 'thinking',
          status: status || 'thinking',
          messages: [msg],
          startTime: msg.timestamp,
          endTime: msg.timestamp
        });
      }
    });
    
    return steps;
  };