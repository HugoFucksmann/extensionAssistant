import React from "react";
// import { styles, combineStyles } from "./styles"; // We'll define styles directly using theme
import { useApp } from "../../context/AppContext";

const StatusIndicator = ({ status = "info", size = "medium" }) => {
  const { theme } = useApp();

  const getStatusStyles = (currentStatus) => {
    const baseStyle = {
      display: "inline-block",
      borderRadius: theme.borderRadius.small, // "4px" or from theme
      transition: theme.transitions.medium, // "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
      position: "relative",
      flexShrink: 0,
      border: "1px solid transparent", // Added for consistency
    };

    const sizeStyles = {
      small: {
        width: "10px",
        height: "10px",
        marginRight: theme.spacing.small, // "8px"
      },
      medium: {
        width: "14px",
        height: "14px",
        marginRight: theme.spacing.medium, // "12px"
      },
      large: {
        width: "18px",
        height: "18px",
        marginRight: theme.spacing.large, // "16px"
      },
    };

    let statusSpecificStyle = {
      backgroundColor: theme.colors.statusInfo,
      borderColor: theme.colors.feedbackInfoBorder, // Or a darker shade like theme.colors.primary
      // boxShadow: `0 0 6px ${theme.colors.statusInfo}40`, // Example glow
    };

    switch (currentStatus) {
      case "thinking":
      case "tool_executing":
        statusSpecificStyle = {
          backgroundColor: theme.colors.statusThinking,
          borderColor: theme.colors.feedbackThinkingBorder,
          // animation: "glowPulse 2s ease-in-out infinite", // CSS class will handle this
        };
        break;
      case "success":
        statusSpecificStyle = {
          backgroundColor: theme.colors.statusSuccess,
          borderColor: theme.colors.feedbackSuccessBorder,
          // animation: "successGlow 0.6s ease-out",
        };
        break;
      case "error":
        statusSpecificStyle = {
          backgroundColor: theme.colors.statusError,
          borderColor: theme.colors.feedbackErrorBorder,
          // animation: "errorPulse 0.8s ease-out",
        };
        break;
      // 'info' case is default
    }
    return { ...baseStyle, ...sizeStyles[size], ...statusSpecificStyle };
  };

  // Keyframes are defined in the <style> tag.
  // The className will trigger the correct animation.
  return (
    <>
      <style>{`
        @keyframes glowPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes successGlow {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes errorPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          25%, 75% { opacity: 0.8; transform: scale(1.05); }
        }
        
        .status-indicator.thinking, .status-indicator.tool_executing {
          animation: glowPulse 2s ease-in-out infinite;
        }
        .status-indicator.success {
          animation: successGlow 0.6s ease-out;
        }
        .status-indicator.error {
          animation: errorPulse 0.8s ease-out;
        }
      `}</style>
      <span className={`status-indicator ${status}`} style={getStatusStyles(status)} />
    </>
  );
};

export default StatusIndicator;