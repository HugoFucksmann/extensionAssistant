import React from "react"

import "../styles/MessageBubble.css"


const MessageBubble = ({ message }) => {
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

  const renderContent = () => {
    // Ensure content exists with fallback
    const content = message?.content || ""

    // Renderizar contenido con formato mejorado
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

  // Get sender with fallback
  const sender = message?.sender || "unknown"

  return (
    <div className={`message-bubble ${sender}`}>
      <div className="bubble-content">
        {renderContent()}
        <div className="message-timestamp">{formatTimestamp(message?.timestamp)}</div>
      </div>
    </div>
  )
}

export default MessageBubble
