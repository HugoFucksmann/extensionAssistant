// src/vscode/react/Components/ChatMessages/ChatMessages.jsx
import React, { useRef, useLayoutEffect, memo, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import MarkdownContent from './MessageContent/MarkdownContent';
/* import ConversationItem from "./new/ConversationItem"; */
import "./ChatMessages.css";

const ChatMessages = () => {
  const { messages, activeFeedbackOperationId } = useApp();
  const messagesEndRef = useRef(null);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const conversations = useMemo(() => {
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
        
        // Set operation ID for the conversation
        if (opId && !currentConversation.operationId) {
          currentConversation.operationId = opId;
          currentConversation.isActive = opId === activeFeedbackOperationId;
        }

        // Categorize message type
        if (message.sender === "assistant" && message.metadata?.isFinalResponse) {
          currentConversation.assistantResponse = message;
        } else {
          currentConversation.operationMessages.push(message);
        }
      } else {
        // Orphaned messages (system messages without user context)
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



// src/vscode/react/Components/ChatMessages/ConversationItem.jsx
//import React, { memo, useState } from 'react';
/* import UserMessage from './UserMessage';
import AssistantResponse from './AssistantResponse'; */
/* import ProcessingSteps from './ProcessingSteps'; */


//export default ConversationItem;

// src/vscode/react/Components/ChatMessages/UserMessage.jsx
/* import React, { memo } from 'react';
import MarkdownContent from './MessageContent/MarkdownContent';
import FileAttachments from './FileAttachments'; */

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

//export default UserMessage;

// src/vscode/react/Components/ChatMessages/AssistantResponse.jsx
/* import React, { memo } from 'react';
import MarkdownContent from './MessageContent/MarkdownContent'; */

const AssistantResponse = memo(({ message, hasProcessingAbove }) => {
  return (
    <div className={`message assistant-message ${hasProcessingAbove ? 'has-processing-above' : ''}`}>
      <div className="message-header">
        <span className="sender-name">Assistant</span>
        <span className="timestamp">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
      
      <div className="message-content">
        <MarkdownContent content={message.content || message.text || ""} />
      </div>
    </div>
  );
});

//export default AssistantResponse;

// src/vscode/react/Components/ChatMessages/ProcessingSteps.jsx
/* import React, { memo, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import StatusIndicator from './StatusIndicator';
import ProcessingStep from './ProcessingStep'; */

const ProcessingSteps = memo(({ 
  messages, 
  isActive, 
  isCollapsed, 
  onToggle, 
  isCompleted 
}) => {
  const { theme } = useApp();

  const stepStats = useMemo(() => {
    const completed = messages.filter(msg => 
      msg.metadata?.status === 'success' || 
      msg.metadata?.status === 'error'
    ).length;
    
    const currentStep = messages.find(msg => 
      msg.metadata?.status === 'tool_executing' || 
      msg.metadata?.status === 'thinking'
    );

    return {
      completed,
      total: messages.length,
      currentStep,
      status: isCompleted ? 'success' : (currentStep?.metadata?.status || 'thinking')
    };
  }, [messages, isCompleted]);

  const headerTitle = useMemo(() => {
    if (isCompleted) return 'Processing Complete';
    if (stepStats.currentStep?.metadata?.toolName) {
      return `Running: ${stepStats.currentStep.metadata.toolName}`;
    }
    return isActive ? 'Processing...' : 'Processing Steps';
  }, [isCompleted, stepStats.currentStep, isActive]);

  return (
    <div className="processing-steps">
      <div className="processing-header" onClick={onToggle}>
        <div className="processing-header-content">
          <StatusIndicator 
            status={stepStats.status} 
            size="medium" 
            animate={isActive && !isCompleted}
          />
          <span className="processing-title">{headerTitle}</span>
          {isActive && !isCompleted && (
            <span className="processing-dots">...</span>
          )}
        </div>
        
        <div className="processing-controls">
          <span className="step-counter">
            {stepStats.completed}/{stepStats.total}
          </span>
          <button 
            className="collapse-button"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
          >
            {isCollapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      <div className={`processing-content ${isCollapsed ? 'collapsed' : 'expanded'}`}>
        <div className="processing-timeline">
          {messages.map((message, index) => (
            <ProcessingStep
              key={message.id || `step-${index}`}
              message={message}
              stepNumber={index + 1}
              isLast={index === messages.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

//export default ProcessingSteps;

// src/vscode/react/Components/ChatMessages/ProcessingStep.jsx
/* import React, { memo } from 'react';
import { useApp } from '../../context/AppContext';
import StatusIndicator from './StatusIndicator';
import MarkdownContent from './MessageContent/MarkdownContent'; */

const ProcessingStep = memo(({ message, stepNumber, isLast }) => {
  const { theme } = useApp();
  
  const status = message.metadata?.status || 'info';
  const toolName = message.metadata?.toolName;
  const content = message.content || message.text || '';
  
  const stepTitle = useMemo(() => {
    if (message.sender === 'assistant') return 'Assistant Update';
    if (toolName) return toolName;
    return status === 'thinking' ? 'Thinking' : 'Processing';
  }, [message.sender, toolName, status]);

  return (
    <div className={`processing-step ${status} ${isLast ? 'last' : ''}`}>
      <div className="step-indicator">
        <StatusIndicator status={status} size="small" />
        <div className="step-line" />
      </div>
      
      <div className="step-content">
        <div className="step-header">
          <span className="step-title">{stepTitle}</span>
          <span className="step-timestamp">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
        
        {content && (
          <div className="step-body">
            <MarkdownContent content={content} />
          </div>
        )}
        
        {message.metadata?.toolOutput && (
          <details className="tool-output">
            <summary>Tool Output</summary>
            <pre>{JSON.stringify(message.metadata.toolOutput, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
});

//export default ProcessingStep;

// src/vscode/react/Components/ChatMessages/FileAttachments.jsx
/* import React, { memo } from 'react'; */

const FileAttachments = memo(({ files }) => {
  if (!files?.length) return null;

  return (
    <div className="file-attachments">
      {files.map((file, index) => (
        <div key={index} className="file-attachment">
          <span className="file-icon">📎</span>
          <span className="file-name">
            {typeof file === 'string' ? file : (file.name || file.path)}
          </span>
        </div>
      ))}
    </div>
  );
});

//export default FileAttachments;

// src/vscode/react/Components/ChatMessages/StatusIndicator.jsx (Updated)
/* import React, { memo } from 'react';
import { useApp } from '../../context/AppContext'; */

const StatusIndicator = memo(({ status = 'info', size = 'medium', animate = false }) => {
  const { theme } = useApp();
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'thinking':
      case 'tool_executing':
        return theme.colors?.statusThinking || 'var(--status-thinking)';
      case 'success':
        return theme.colors?.statusSuccess || 'var(--status-success)';
      case 'error':
        return theme.colors?.statusError || 'var(--status-error)';
      default:
        return theme.colors?.statusInfo || 'var(--status-info)';
    }
  };

  const getSize = (size) => {
    switch (size) {
      case 'small': return '8px';
      case 'large': return '16px';
      default: return '12px';
    }
  };

  const indicatorStyle = {
    width: getSize(size),
    height: getSize(size),
    borderRadius: '50%',
    backgroundColor: getStatusColor(status),
    display: 'inline-block',
    marginRight: size === 'small' ? '6px' : '8px',
    animation: animate && ['thinking', 'tool_executing'].includes(status) ? 
      'pulse 2s ease-in-out infinite' : 'none',
    transition: 'all 0.2s ease'
  };

  return <span style={indicatorStyle} />;
});


const ConversationItem = memo(({ conversation }) => {
  const { userMessage, assistantResponse, operationMessages, isActive } = conversation;
  const [showSteps, setShowSteps] = useState(isActive);

  const hasProcessing = operationMessages.length > 0;
  const isCompleted = assistantResponse && !isActive;

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



//export default StatusIndicator;

export default memo(ChatMessages);