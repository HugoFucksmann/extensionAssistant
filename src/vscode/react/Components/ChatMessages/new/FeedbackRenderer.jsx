
import { useState } from "react"
import StatusIndicator from "./StatusIndicator"
import "../styles/FeedbackRenderer.css"



const FeedbackRenderer = ({  messages = [], isActive }) => {
  const [isExpanded, setIsExpanded] = useState(isActive)

 
  const messageArray = Array.isArray(messages) ? messages.filter((msg) => msg && typeof msg === "object") : []

  
  const latestMessage = messageArray[messageArray.length - 1]
  const currentStatus = latestMessage?.metadata?.status || "info"
  const toolName = latestMessage?.metadata?.toolName

  
  const getTitle = () => {
    if (toolName) {
      switch (currentStatus) {
        case "thinking":
          return `Preparando ${toolName}...`
        case "tool_executing":
          return `Ejecutando ${toolName}...`
        case "success":
          return `${toolName} completado`
        case "error":
          return `Error en ${toolName}`
        default:
          return `${toolName}`
      }
    }

    switch (currentStatus) {
      case "thinking":
        return "Analizando solicitud..."
      case "tool_executing":
        return "Ejecutando operación..."
      case "success":
        return "Operación completada"
      case "error":
        return "Error en la operación"
      default:
        return "Procesando..."
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "thinking":
      case "tool_executing":
        return "var(--status-thinking)"
      case "success":
        return "var(--status-success)"
      case "error":
        return "var(--status-error)"
      default:
        return "var(--status-info)"
    }
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp || isNaN(timestamp)) {
      return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    }
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  if (messageArray.length === 0) {
    return null
  }

  return (
    <div className={`feedback-renderer ${currentStatus} ${isActive ? "active" : ""}`}>
      <div
        className="feedback-header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ borderColor: getStatusColor(currentStatus) }}
      >
        <div className="feedback-title">
          <StatusIndicator status={currentStatus} size="small" />
          <span className="title-text">{getTitle()}</span>
          {messageArray.length > 1 && <span className="step-counter">({messageArray.length} pasos)</span>}
        </div>

        <div className="feedback-controls">
          <span className="timestamp">{formatTimestamp(latestMessage?.timestamp)}</span>
          <button className={`expand-button ${isExpanded ? "expanded" : ""}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="feedback-content">
          <div className="feedback-timeline">
            {messageArray.map((message, index) => (
              <div
                key={message?.id || `timeline-${index}`}
                className={`timeline-item ${message?.metadata?.status || "info"}`}
              >
                <div className="timeline-marker">
                  <StatusIndicator status={message?.metadata?.status || "info"} size="small" />
                </div>
                <div className="timeline-content">
                  <div className="timeline-message">{message?.content || "No content"}</div>
                  <div className="timeline-timestamp">{formatTimestamp(message?.timestamp)}</div>
                  {message?.metadata?.toolName && (
                    <div className="timeline-tool">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
                      </svg>
                      {message.metadata.toolName}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FeedbackRenderer
