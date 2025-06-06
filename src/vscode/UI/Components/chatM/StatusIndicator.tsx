import type React from "react"
import "./styles/StatusIndicator.css"

interface StatusIndicatorProps {
  status: string
  size?: "small" | "medium" | "large"
  showLabel?: boolean
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, size = "medium", showLabel = false }) => {
  const getStatusClass = (): string => {
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

  const getStatusLabel = (): string => {
    switch (status) {
      case "thinking":
        return "Pensando..."
      case "tool_executing":
        return "Ejecutando..."
      case "success":
        return "Completado"
      case "completed":
        return "Completado"
      case "error":
        return "Error"
      case "failed":
        return "Falló"
      case "pending":
        return "Pendiente"
      case "skipped":
        return "Omitido"
      default:
        return "Info"
    }
  }

  return (
    <div className={`status-indicator ${size}`}>
      <div className={`status-box ${getStatusClass()}`} />
      {showLabel && <span className="status-label">{getStatusLabel()}</span>}
    </div>
  )
}
