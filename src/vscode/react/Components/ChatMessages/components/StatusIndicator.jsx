// src/vscode/react/Components/ChatMessages/StatusIndicator.jsx
import React, { memo } from "react";
import { useApp } from "../../../context/AppContext";

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
    borderRadius: '3px',
    backgroundColor: getStatusColor(status),
    display: 'inline-block',
    marginRight: size === 'small' ? '6px' : '8px',
    animation: animate && ['thinking', 'tool_executing'].includes(status) ? 
      'pulse 2s ease-in-out infinite' : 'none',
    transition: 'all 0.2s ease',
    boxShadow: `0 0 8px ${getStatusColor(status)}40, 0 0 16px ${getStatusColor(status)}20`,
    border: `1px solid ${getStatusColor(status)}60`
  };

  return <span style={indicatorStyle} />;
});

export default StatusIndicator;