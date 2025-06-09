/* import type React from "react"
import "./styles/StatusIndicator.css"

interface StatusIndicatorProps {
  status: string
  size?: "small" | "medium" | "large"
  showLabel?: boolean
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, size = "medium", showLabel = false }) => {
  // CAMBIO: Simplificamos la lógica para mapear múltiples estados a tres clases CSS principales.
  const getStatusClass = (): string => {
    if (status === "success" || status === "completed") {
      return "success"
    }
    if (status === "error" || status === "failed") {
      return "error"
    }
    // Todos los demás estados (thinking, tool_executing, pending, etc.) se consideran "processing".
    return "processing"
  }

  // CAMBIO: Simplificamos las etiquetas para que coincidan con los tres estados.
  const getStatusLabel = (): string => {
    const statusClass = getStatusClass()
    switch (statusClass) {
      case "success":
        return "Completado"
      case "error":
        return "Error"
      case "processing":
      default:
        return "Procesando..."
    }
  }

  return (
    <div className={`status-indicator ${size}`}>
      <div className={`status-box ${getStatusClass()}`} />
      {showLabel && <span className="status-label">{getStatusLabel()}</span>}
    </div>
  )
} */