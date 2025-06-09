import type React from "react"
import "./styles/StatusIndicator.css"

interface StatusIndicatorProps {
  isVisible: boolean
  loadingText: string
  size?: "small" | "medium" | "large"
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  isVisible, 
  loadingText, 
  size = "medium" 
}) => {
  if (!isVisible) {
    return null
  }

  return (
    <div className={`status-indicator ${size}`}>
      <div className="status-content">
        <div className="status-dot processing" />
        <span className="status-text">{loadingText}</span>
      </div>
    </div>
  )
}