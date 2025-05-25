
import React, { useState, useEffect } from "react"
import FeedbackCard from "./FeedbackCard"
import StatusIndicator from "./StatusIndicator"
import { useApp } from "../../context/AppContext"
import { styles, combineStyles } from "./styles"

const SystemMessage = ({ message, onStatusChange }) => {
  const { theme } = useApp()
  const [isOpen, setIsOpen] = useState(true)
  const [currentStatus, setCurrentStatus] = useState(message.metadata?.status || "thinking")
  const [feedbackItems, setFeedbackItems] = useState(message.metadata?.feedbackItems || [])

  useEffect(() => {
    if (currentStatus === "thinking") {
      const timer = setTimeout(() => {
        const newItem = {
          id: `feedback_${Date.now()}`,
          content: "Procesamiento completado exitosamente",
          metadata: { status: "success" },
        }

        setFeedbackItems((prev) => [...prev, newItem])
        setCurrentStatus("success")

        sendToBackend({
          type: "system_message_update",
          messageId: message.id,
          status: "success",
          feedbackItems: [...feedbackItems, newItem],
        })

        if (onStatusChange) {
          onStatusChange(message.id, "success")
        }
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [currentStatus, message.id, feedbackItems, onStatusChange])

  const sendToBackend = (data) => {
    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage(
        {
          type: "vscode_chat_update",
          payload: data,
        },
        "*",
      )
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "thinking":
      case "tool_executing":
        return "Procesando solicitud..."
      case "error":
        return "Proceso fallido"
      case "success":
        return "Proceso completado"
      default:
        return "Información del proceso"
    }
  }

  const headerStyle = combineStyles(styles.systemMessageHeader, isOpen ? styles.systemMessageHeaderOpen : {})

  const toggleIconStyle = combineStyles(
    styles.systemMessageToggleIcon,
    isOpen ? styles.systemMessageToggleIconOpen : {},
  )

  return (
    <>
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
            max-height: 0;
          }
          to {
            opacity: 1;
            transform: translateY(0);
            max-height: 500px;
          }
        }
        .system-message-header:hover {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.04) 0%, 
            rgba(255, 255, 255, 0.02) 100%) !important;
          border-color: rgba(255, 255, 255, 0.12) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
        }
        .toggle-icon:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          color: rgba(255, 255, 255, 0.8) !important;
        }
      `}</style>
      <div style={styles.systemMessageContainer}>
        <div className="system-message-header" style={headerStyle} onClick={() => setIsOpen(!isOpen)}>
          <div style={styles.systemMessageTitleContainer}>
            <StatusIndicator status={currentStatus} size="medium" />
            <span>{getStatusText(currentStatus)}</span>
          </div>
          <div className="toggle-icon" style={toggleIconStyle}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 8.5L2.5 5h7L6 8.5z" />
            </svg>
          </div>
        </div>
        {isOpen && (
          <div style={styles.systemMessageContent}>
            <FeedbackCard
              message={{
                id: "initial",
                content: message.text || "Iniciando proceso del sistema...",
                metadata: { status: "info" },
              }}
            />

            {feedbackItems.map((item) => (
              <FeedbackCard key={item.id} message={item} />
            ))}

            {currentStatus === "thinking" && (
              <FeedbackCard
                message={{
                  id: "loading",
                  content: "Ejecutando herramientas de análisis...",
                  metadata: { status: "thinking" },
                }}
              />
            )}
          </div>
        )}
        <div style={styles.messageTimestamp}>{new Date(message.timestamp).toLocaleTimeString()}</div>
      </div>
    </>
  )
}

export default SystemMessage
