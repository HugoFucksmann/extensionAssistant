"use client"

import React, { ReactElement, useState } from "react"
import { getToolDefinition } from "../data/toolOutputs"
import "../styles/ToolRenderer.css"

interface ToolChildProps {
  toolInput?: Record<string, any>;
  toolOutput?: any;
  status?: string;
  isSuccess?: boolean;
  [key: string]: any; // Allow any additional props
}

interface ToolRendererBaseProps {
  toolName: string
  toolInput?: Record<string, any>
  toolOutput?: any
  status?: string
  success?: boolean
  message?: string
  timestamp?: number
  children?: React.ReactNode
}

const formatTimestamp = (ts?: number): string => {
  const time = ts && !isNaN(ts) ? new Date(ts) : new Date()
  return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const getActionText = (toolName: string, toolInput?: Record<string, any>, status?: string): string => {
  const definition = getToolDefinition(toolName)
  const baseAction = definition?.displayName || toolName

  // Crear texto descriptivo basado en la herramienta y su input
  switch (toolName) {
    case "search":
      return `Buscando: ${toolInput?.query || "..."}`
    case "file_examine":
    case "file_read":
    case "getFileContents":
      const fileName = toolInput?.filePath?.split("/").pop() || toolInput?.filePath || "archivo"
      return `Examinando archivo: ${fileName}`
    case "file_edit":
    case "file_write":
      const editFileName = toolInput?.filePath?.split("/").pop() || toolInput?.filePath || "archivo"
      return `Editando archivo: ${editFileName}`
    case "project_search":
      return `Buscando en proyecto: ${toolInput?.query || "..."}`
    case "console_command":
    case "terminal":
      const command = toolInput?.command?.split(" ")[0] || "comando"
      return `Ejecutando: ${command}`
    case "getGitStatus":
      return "Obteniendo estado de Git"
    case "getProjectSummary":
      return "Generando resumen del proyecto"
    default:
      return baseAction
  }
}

export const ToolRendererBase: React.FC<ToolRendererBaseProps> = ({
  toolName,
  toolInput = {},
  toolOutput,
  status = "thinking",
  success,
  message,
  timestamp,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const definition = getToolDefinition(toolName)
  const isSuccess = success !== undefined ? success : status === "success" || toolOutput?.success
  const isError = status === "error" || success === false
  const isProcessing = status === "thinking" || status === "tool_executing"
  const hasDetails = React.Children.count(children) > 0

  const getStatusColor = () => {
    if (isError) return "var(--status-error)"
    if (isSuccess) return "var(--status-success)"
    if (isProcessing) return "var(--status-warning)"
    return "var(--text-muted)"
  }

  const renderStatusIndicator = () => {
    return (
      <div
        className={`status-square ${isProcessing ? "processing" : isError ? "error" : "success"}`}
        style={{ backgroundColor: getStatusColor() }}
      />
    )
  }

  const handleToggleExpand = () => {
    if (hasDetails && !isProcessing) {
      setIsExpanded(!isExpanded)
    }
  }

  const actionText = getActionText(toolName, toolInput, status)

  return (
    <div
      className={`tool-card ${status} ${isSuccess ? "success" : ""} ${isError ? "error" : ""} ${isExpanded ? "expanded" : ""}`}
    >
      <div
        className={`tool-card-header ${hasDetails && !isProcessing ? "clickable" : ""}`}
        onClick={handleToggleExpand}
      >
        <div className="tool-main-info">
          {renderStatusIndicator()}
          <span className="tool-action-text">{actionText}</span>
        </div>

        <div className="tool-controls">
          <span className="tool-timestamp">{formatTimestamp(timestamp)}</span>

          {hasDetails && !isProcessing && (
            <button
              className={`expand-button ${isExpanded ? "expanded" : ""}`}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Ocultar detalles" : "Mostrar detalles"}
            >
              <span className="expand-icon">{isExpanded ? "−" : "+"}</span>
            </button>
          )}
        </div>
      </div>

      {isExpanded && hasDetails && !isProcessing && (
        <div className="tool-card-content">
          <div className="tool-details-expanded">
            {React.Children.map(children, (child) =>
              React.isValidElement<ToolChildProps>(child)
                ? React.cloneElement(child, {
                    toolInput,
                    toolOutput,
                    status,
                    isSuccess,
                  } as ToolChildProps)
                : child
            )}
          </div>
        </div>
      )}

      {message && !hasDetails && !isProcessing && (
        <div className="tool-card-content">
          <div className="tool-message">{message}</div>
        </div>
      )}
    </div>
  )
}
