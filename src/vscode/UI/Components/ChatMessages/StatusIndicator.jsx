import React from "react"
import "./styles/StatusIndicator.css"

const StatusIndicator = ({ status, size = "medium" }) => {
  const getStatusClass = () => {
    switch (status) {
      case "thinking":
      case "tool_executing":
        return "processing"
      case "success":
      case "completed":
        return "success"
      case "error":
      case "failed":
        return "error"
      case "user_input_pending":
      case "pending":
        return "pending"
      case "skipped":
        return "skipped"
      default:
        return "info"
    }
  }

  return (
    <div className={`status-indicator ${size}`}>
      <div className={`status-box ${getStatusClass()}`} />
    </div>
  )
}

export default StatusIndicator