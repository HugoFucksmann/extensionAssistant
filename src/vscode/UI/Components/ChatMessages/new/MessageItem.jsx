import React from "react"
import StatusIndicator from "./StatusIndicator"
import ToolRenderer from "./ToolRenderer"
import "../styles/MessageItem.css"


const MessageItem = ({ message }) => {
  // Validate message object
  if (!message || typeof message !== "object") {
    return null
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp || isNaN(timestamp)) {
      return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    }
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Get sender with fallback
  const sender = message?.sender || "unknown"
  const metadata = message?.metadata || {}
  const status = metadata?.status || null
  const toolName = metadata?.toolName || null
  const toolInput = metadata?.toolInput || null
  const toolOutput = metadata?.toolOutput || null
  const success = metadata?.success
  const processingTime = metadata?.processingTime

  // Determinar si debe usar ToolRenderer
  const shouldUseToolRenderer = (sender === "system" || sender === "feedback") && toolName && status

  // Si es un mensaje de sistema con herramienta, usar ToolRenderer
  if (shouldUseToolRenderer) {
    return (
      <div className={`message-item ${sender} ${status ? status : ""}`}>
        {/* Solo mostrar indicador durante estados de procesamiento */}
        {(sender === "system" || sender === "feedback") && (status === "thinking" || status === "tool_executing") && (
          <div className="message-status">
            <StatusIndicator status={status} size="small" />
          </div>
        )}
        <ToolRenderer
          toolName={toolName}
          toolInput={toolInput}
          toolOutput={toolOutput}
          status={status}
          success={success}
          message={message.content}
          timestamp={message.timestamp}
          isFinalResponse={metadata?.isFinalToolResponse}
        />
      </div>
    )
  }

  // Renderizado simple para mensajes sin herramientas o con datos incompletos
  const renderSimpleContent = () => {
    const content = message?.content || ""
    const lines = content.split("\n")

    return (
      <div className="message-content">
        {lines.map((line, index) => {
          // Detectar bloques de código
          if (line.startsWith("```")) {
            return (
              <div key={index} className="code-delimiter">
                {line}
              </div>
            )
          }

          // Detectar líneas de código inline
          if (line.includes("`") && line.match(/`[^`]+`/)) {
            const parts = line.split(/(`[^`]+`)/)
            return (
              <div key={index} className="text-line">
                {parts.map((part, partIndex) =>
                  part.startsWith("`") && part.endsWith("`") ? (
                    <code key={partIndex} className="inline-code">
                      {part.slice(1, -1)}
                    </code>
                  ) : (
                    <span key={partIndex}>{part}</span>
                  ),
                )}
              </div>
            )
          }

          return (
            <div key={index} className="text-line">
              {line}
            </div>
          )
        })}

        {message.files && Array.isArray(message.files) && message.files.length > 0 && (
          <div className="message-attachments">
            {message.files.map((file, index) => (
              <div key={index} className="attachment">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
                <span>{file}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Renderizado simple con indicador de estado opcional
  return (
    <div className={`message-item ${sender} ${status ? status : ""}`}>
      {/* Solo mostrar indicador durante estados de procesamiento */}
      {(sender === "system" || sender === "feedback") && (status === "thinking" || status === "tool_executing") && (
        <div className="message-status">
          <StatusIndicator status={status} size="small" />
        </div>
      )}

      <div className="message-bubble">
        <div className="bubble-content">
          {/* Si hay toolName pero sin datos completos, mostrar mensaje simple con contexto */}
          {toolName && !shouldUseToolRenderer && (
            <div className="simple-tool-indicator">
              <span className="tool-name">{toolName}</span>
              {status && <span className="tool-status-text">({status})</span>}
            </div>
          )}

          {renderSimpleContent()}
          <div className="message-timestamp">{formatTimestamp(message?.timestamp)}</div>
        </div>
      </div>
    </div>
  )
}

export default MessageItem
