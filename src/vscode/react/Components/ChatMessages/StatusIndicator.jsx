import React from "react";
import { useApp } from "../../context/AppContext";
import "./StatusIndicator.css";

const StatusIndicator = ({ status = "info", size = "medium" }) => {
  const { theme } = useApp();

  const sizeClass = `status-size-${size}`;
  const colorClass = `status-color-${status}`;
  const animationClass = ['thinking', 'tool_executing'].includes(status) ? 'pulse' : 
                        status === 'success' ? 'success-glow' : 
                        status === 'error' ? 'error-pulse' : '';

  return (
    <span 
      className={`${sizeClass} ${colorClass} ${animationClass ? 'status-' + animationClass : ''}`}
    />
  );
};

export default StatusIndicator;