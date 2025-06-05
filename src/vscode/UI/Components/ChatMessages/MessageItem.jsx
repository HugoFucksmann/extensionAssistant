import React from "react"
import StatusIndicator from "./StatusIndicator"
import ToolRenderer from "./ToolsRender/ToolRenderer"
import "./styles/MessageItem.css"

const formatTimestamp = (timestamp) => {
  const time = timestamp && !isNaN(timestamp) ? new Date(timestamp) : new Date()
  return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const MessageItem = ({ message }) => {
  if (!message || typeof message !== "object") return null

  const { sender = "unknown", content = "", timestamp, metadata = {}, files } = message
  const { status, toolName, toolInput, toolOutput, success, processingTime } = metadata

  // Use ToolRenderer for system messages with tools
  const useToolRenderer = (sender === "system" || sender === "feedback") && toolName && status

  if (useToolRenderer) {
    return (
      <div className={`message-item ${sender} ${status || ""}`}>
        {(status === "thinking" || status === "tool_executing") && (
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
          message={content}
          timestamp={timestamp}
          isFinalResponse={metadata?.isFinalToolResponse}
        />
      </div>
    )
  }

  // Simple message rendering
  const renderContent = () => (
    <div className="message-content">
      {content.split("\n").map((line, index) => {
        if (line.startsWith("```")) {
          return <div key={index} className="code-delimiter">{line}</div>
        }
        
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
                )
              )}
            </div>
          )
        }
        
        return <div key={index} className="text-line">{line}</div>
      })}

      {files?.length > 0 && (
        <div className="message-attachments">
          {files.map((file, index) => (
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

  return (
    <div className={`message-item ${sender} ${status || ""}`}>
      {(status === "thinking" || status === "tool_executing") && (
        <div className="message-status">
          <StatusIndicator status={status} size="small" />
        </div>
      )}

      <div className="message-bubble">
        <div className="bubble-content">
          {toolName && !useToolRenderer && (
            <div className="simple-tool-indicator">
              <span className="tool-name">{toolName}</span>
              {status && <span className="tool-status-text">({status})</span>}
            </div>
          )}
          
          {renderContent()}
          <div className="message-timestamp">{formatTimestamp(timestamp)}</div>
        </div>
      </div>
    </div>
  )
}

export default MessageItem