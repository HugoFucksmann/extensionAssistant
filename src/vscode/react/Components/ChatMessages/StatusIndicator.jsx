
import React from "react";
import { useApp } from "../../context/AppContext";

const StatusIndicator = ({ status = "info", size = "medium" }) => {
  const { theme } = useApp();

  const sizeMap = {
    small: { width: "10px", height: "10px", marginRight: theme.spacing.small },
    medium: { width: "14px", height: "14px", marginRight: theme.spacing.medium },
    large: { width: "18px", height: "18px", marginRight: theme.spacing.large },
  };

  const colorMap = {
    thinking: theme.colors.statusThinking,
    tool_executing: theme.colors.statusThinking,
    success: theme.colors.statusSuccess,
    error: theme.colors.statusError,
    info: theme.colors.statusInfo,
  };

  const style = {
    display: "inline-block",
    borderRadius: theme.borderRadius.small,
    backgroundColor: colorMap[status] || colorMap.info,
    border: "1px solid transparent",
    transition: theme.transitions.medium,
    position: "relative",
    flexShrink: 0,
    ...sizeMap[size],
  };

  const animationClass = ['thinking', 'tool_executing'].includes(status) ? 'pulse' : 
                        status === 'success' ? 'success-glow' : 
                        status === 'error' ? 'error-pulse' : '';

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes success-glow {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes error-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          25%, 75% { opacity: 0.8; transform: scale(1.05); }
        }
        .status-pulse { animation: pulse 2s ease-in-out infinite; }
        .status-success-glow { animation: success-glow 0.6s ease-out; }
        .status-error-pulse { animation: error-pulse 0.8s ease-out; }
      `}</style>
      <span 
        className={`status-${animationClass}`}
        style={style} 
      />
    </>
  );
};

export default StatusIndicator;