import React from "react"
import { styles, combineStyles } from "./styles"
import { useApp } from "../../context/AppContext"

const StatusIndicator = ({ status = "info", size = "medium" }) => {
  const { theme } = useApp()

  const getStatusStyles = (status) => {
    const baseStyle = combineStyles(
      styles.statusIndicator,
      styles[`statusIndicator${size.charAt(0).toUpperCase() + size.slice(1)}`],
    )

    switch (status) {
      case "thinking":
      case "tool_executing":
        return combineStyles(baseStyle, styles.statusIndicatorThinking)
      case "success":
        return combineStyles(baseStyle, styles.statusIndicatorSuccess)
      case "error":
        return combineStyles(baseStyle, styles.statusIndicatorError)
      case "info":
      default:
        return combineStyles(baseStyle, styles.statusIndicatorInfo)
    }
  }

  return (
    <>
      <style>{`
        @keyframes glowPulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.7; 
            transform: scale(1.05);
          }
        }
        @keyframes successGlow {
          0% { 
            opacity: 1; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.8; 
            transform: scale(1.1);
          }
          100% { 
            opacity: 1; 
            transform: scale(1);
          }
        }
        @keyframes errorPulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
          }
          25%, 75% { 
            opacity: 0.8; 
            transform: scale(1.05);
          }
        }
      `}</style>
      <span className={`status-indicator ${status}`} style={getStatusStyles(status)} />
    </>
  )
}

export default StatusIndicator
