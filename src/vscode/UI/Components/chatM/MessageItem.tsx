import type React from "react"
import { ToolRenderer } from "./tools/ToolRenderer"
import type { ChatMessage } from "./types"
import "./styles/MessageItem.css"

interface MessageItemProps {
  message: ChatMessage
  isLast?: boolean
}

const formatTimestamp = (timestamp: number): string => {
  const time = timestamp && !isNaN(timestamp) ? new Date(timestamp) : new Date()
  return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase()

  switch (ext) {
    case "pdf":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      )
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z" />
        </svg>
      )
    case "doc":
    case "docx":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      )
    case "txt":
    case "md":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      )
  }
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, isLast = false }) => {
  if (!message || typeof message !== "object") return null

  const { sender = "unknown", content = "", timestamp, metadata = {}, files } = message
  const { status, toolName, toolInput, toolOutput, success, processingTime } = metadata

  // Use ToolRenderer for system messages with tools
  const useToolRenderer = (sender === "system" || sender === "feedback") && toolName && status

  if (useToolRenderer) {
    return (
      <div className={`message-item ${sender} ${status || ""} ${isLast ? "last" : ""}`}>
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
          return (
            <div key={index} className="code-delimiter">
              {line}
            </div>
          )
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
    </div>
  )

  const renderAttachments = () => {
    if (!files || files.length === 0) return null

    return (
      <div className="message-attachments">
        <div className="attachments-header">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.5,6V17.5A4,4 0 0,1 12.5,21.5A4,4 0 0,1 8.5,17.5V5A2.5,2.5 0 0,1 11,2.5A2.5,2.5 0 0,1 13.5,5V15.5A1,1 0 0,1 12.5,16.5A1,1 0 0,1 11.5,15.5V6H10V15.5A2.5,2.5 0 0,0 12.5,18A2.5,2.5 0 0,0 15,15.5V5A4,4 0 0,0 11,1A4,4 0 0,0 7,5V17.5A5.5,5.5 0 0,0 12.5,23A5.5,5.5 0 0,0 18,17.5V6H16.5Z" />
          </svg>
          {files.length} archivo{files.length > 1 ? "s" : ""} adjunto{files.length > 1 ? "s" : ""}
        </div>
        <div className="attachments-grid">
          {files.map((file, index) => {
            // Simular información del archivo
            const fileName = typeof file === "string" ? file : file.name || "archivo"
            const fileSize =
              typeof file === "object" && file.size ? file.size : Math.floor(Math.random() * 1000000) + 1000

            return (
              <div key={index} className="attachment">
                <div className="attachment-icon">{getFileIcon(fileName)}</div>
                <div className="attachment-info">
                  <div className="attachment-name">{fileName}</div>
                  <div className="attachment-size">{formatFileSize(fileSize)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const getSenderLabel = (sender: string): string => {
    switch (sender) {
      case "user":
        return "Tú"
      case "assistant":
        return "Asistente"
      case "system":
        return "Sistema"
      default:
        return sender
    }
  }

  return (
    <div className={`message-item ${sender} ${status || ""} ${isLast ? "last" : ""}`}>
      <div className="message-bubble">
        <div className="message-header">
          <span className="sender-label">{getSenderLabel(sender)}</span>
          <span className="message-timestamp">{formatTimestamp(timestamp)}</span>
        </div>

        <div className="bubble-content">
          {toolName && !useToolRenderer && (
            <div className="simple-tool-indicator">
              <span className="tool-name">{toolName}</span>
              {status && <span className="tool-status-text">({status})</span>}
            </div>
          )}

          {renderContent()}
          {renderAttachments()}
        </div>
      </div>
    </div>
  )
}
