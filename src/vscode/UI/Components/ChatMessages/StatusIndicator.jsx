import React from "react"
import "./styles/StatusIndicator.css"



const StatusIndicator = ({ status, size = "medium" }) => {
  const getStatusIcon = () => {
    switch (status) {
      case "thinking":
      case "tool_executing":
        return <div className="status-pulse-box processing"></div>
      case "success":
        return <div className="status-success-box completed"></div>
      case "error":
        return <div className="status-error-box failed"></div>
      case "user_input_pending":
        return <div className="status-pending-box pending"></div>
      case "skipped":
        return <div className="status-skipped-box skipped"></div>
      case "info":
      default:
        return <div className="status-info-box"></div>
    }
  }

  return <div className={`status-indicator ${status} ${size}`}>{getStatusIcon()}</div>
}

export default StatusIndicator
