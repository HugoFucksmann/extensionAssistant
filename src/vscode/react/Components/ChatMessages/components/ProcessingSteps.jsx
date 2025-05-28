// src/vscode/react/Components/ChatMessages/ProcessingSteps.jsx
import React, { memo, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import ProcessingStepGroup from "./ProcessingStepGroup";
import StatusIndicator from "./StatusIndicator";
import { groupProcessingSteps } from "../utils/processingUtils";

const ProcessingSteps = memo(({ 
  messages, 
  isActive, 
  isCollapsed, 
  onToggle, 
  isCompleted 
}) => {
  const { theme } = useApp();

  const groupedSteps = useMemo(() => {
    return groupProcessingSteps(messages);
  }, [messages]);

  const stepStats = useMemo(() => {
    const completed = groupedSteps.filter(step => 
      step.status === 'success' || step.status === 'error'
    ).length;
    
    const currentStep = groupedSteps.find(step => 
      step.status === 'tool_executing' || step.status === 'thinking'
    );

    return {
      completed,
      total: groupedSteps.length,
      currentStep,
      status: isCompleted ? 'success' : (currentStep?.status || 'thinking')
    };
  }, [groupedSteps, isCompleted]);

  const headerTitle = useMemo(() => {
    if (isCompleted) return 'Processing Complete';
    if (stepStats.currentStep?.name && stepStats.currentStep.name !== 'thinking') {
      return `Running: ${stepStats.currentStep.name}`;
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
          {groupedSteps.map((step, index) => (
            <ProcessingStepGroup
              key={`${step.name}-${index}`}
              step={step}
              stepNumber={index + 1}
              isLast={index === groupedSteps.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export default ProcessingSteps;