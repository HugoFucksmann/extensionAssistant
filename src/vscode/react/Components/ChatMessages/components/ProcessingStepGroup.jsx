// src/vscode/react/Components/ChatMessages/ProcessingStepGroup.jsx
import React, { memo, useMemo } from "react";
import MarkdownContent from './MarkdownContent';
import StatusIndicator from "./StatusIndicator";

const ProcessingStepGroup = memo(({ step, stepNumber, isLast }) => {
  const stepTitle = useMemo(() => {
    if (step.name === 'thinking') return 'Thinking';
    return step.name;
  }, [step.name]);

  const lastMessage = step.messages[step.messages.length - 1];
  const content = lastMessage?.content || lastMessage?.text || '';

  return (
    <div className={`processing-step ${step.status} ${isLast ? 'last' : ''}`}>
      <div className="step-indicator">
        <StatusIndicator status={step.status} size="small" />
        <div className="step-line" />
      </div>
      
      <div className="step-content">
        <div className="step-header">
          <span className="step-title">{stepTitle}</span>
          <span className="step-timestamp">
            {new Date(step.endTime).toLocaleTimeString()}
          </span>
        </div>
        
        {content && (
          <div className="step-body">
            <MarkdownContent content={content} />
          </div>
        )}
        
        {lastMessage?.metadata?.toolOutput && (
          <details className="tool-output">
            <summary>Tool Output</summary>
            <pre>{JSON.stringify(lastMessage.metadata.toolOutput, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
});

export default ProcessingStepGroup;