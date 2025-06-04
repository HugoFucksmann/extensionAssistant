import React, { useState } from "react"
import "./styles/ToolRenderer.css"

const TOOL_CONFIG = {
  search: { name: "Búsqueda Web", icon: "search" },
  file_examine: { name: "Examinar Archivo", icon: "file" },
  file_read: { name: "Examinar Archivo", icon: "file" },
  file_edit: { name: "Editar Archivo", icon: "edit" },
  file_write: { name: "Editar Archivo", icon: "edit" },
  project_search: { name: "Búsqueda en Proyecto", icon: "folder-search" },
  console_command: { name: "Comando de Consola", icon: "terminal" },
  terminal: { name: "Comando de Consola", icon: "terminal" }
}

const formatTimestamp = (ts) => {
  const time = ts && !isNaN(ts) ? new Date(ts) : new Date()
  return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const ToolRenderer = ({
  toolName,
  toolInput = {},
  toolOutput,
  status = "thinking",
  success,
  message,
  timestamp
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDiff, setShowDiff] = useState(false)

  const config = TOOL_CONFIG[toolName] || { name: toolName || "Herramienta", icon: "tools" }
  const isSuccess = success !== undefined ? success : (status === "success" || toolOutput?.success)
  const data = toolOutput?.data || toolOutput || {}

  const renderIcon = () => {
    const isProcessing = status === "thinking" || status === "tool_executing"
    return (
      <div className={`codicon codicon-${config.icon} tool-icon ${isProcessing ? "processing" : ""}`} />
    )
  }

  const renderSummary = () => {
    if (!isSuccess && message) {
      return <div className="tool-error">{message}</div>
    }

    switch (toolName) {
      case "search":
        return (
          <div className="tool-summary">
            <span className="tool-query">"{toolInput.query || toolInput.q || "Búsqueda"}"</span>
            {data.results && <span className="tool-results">{data.results.length} resultados</span>}
          </div>
        )

      case "file_examine":
      case "file_read":
        return (
          <div className="tool-summary">
            <span className="tool-file">{toolInput.file || toolInput.path || "archivo"}</span>
            {data.size && <span className="file-size">{data.size}</span>}
          </div>
        )

      case "file_edit":
      case "file_write":
        return (
          <div className="tool-summary">
            <span className="tool-file">{toolInput.file || toolInput.path || "archivo"}</span>
            {(data.linesAdded || data.linesRemoved) && (
              <span className="tool-changes">+{data.linesAdded || 0} -{data.linesRemoved || 0}</span>
            )}
          </div>
        )

      case "project_search":
        return (
          <div className="tool-summary">
            <span className="tool-pattern">/{toolInput.pattern || toolInput.query || "patrón"}/</span>
            {data.matches && <span className="tool-matches">{data.matches.length} coincidencias</span>}
          </div>
        )

      case "console_command":
      case "terminal":
        return (
          <div className="console-summary">
            <code className="command-line">$ {toolInput.command || toolInput.cmd || "comando"}</code>
            {data.exitCode !== undefined && <span className="exit-code">exit: {data.exitCode}</span>}
          </div>
        )

      default:
        return <div className="tool-summary">{message || `Ejecutando ${toolName}...`}</div>
    }
  }

  const renderDetails = () => {
    if (!isExpanded || !isSuccess) return null

    switch (toolName) {
      case "file_examine":
      case "file_read":
        return data.content && (
          <div className="tool-details">
            <div className="file-preview">
              <div className="preview-header">Vista previa:</div>
              <div className="code-content">
                <pre><code>{data.content}</code></pre>
              </div>
            </div>
          </div>
        )

      case "file_edit":
      case "file_write":
        return data.diff && (
          <div className="tool-details">
            <div className="diff-container">
              <div className="diff-header">
                <span>Cambios realizados:</span>
                <button 
                  className={`diff-toggle ${showDiff ? "active" : ""}`} 
                  onClick={() => setShowDiff(!showDiff)}
                >
                  {showDiff ? "Ocultar" : "Mostrar"} diff
                </button>
              </div>
              {showDiff && (
                <div className="diff-content">
                  <pre><code>{JSON.stringify(data.diff, null, 2)}</code></pre>
                </div>
              )}
            </div>
          </div>
        )

      case "console_command":
      case "terminal":
        return (data.output || data.stdout) && (
          <div className="console-output">
            <div className="console-header">Salida:</div>
            <div className="console-content">
              <pre>{data.output || data.stdout}</pre>
              {data.stderr && (
                <div className="console-error">
                  <div className="error-header">Error:</div>
                  <pre>{data.stderr}</pre>
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const hasDetails = () => {
    switch (toolName) {
      case "file_examine":
      case "file_read":
        return !!data.content
      case "file_edit":
      case "file_write":
        return !!data.diff
      case "console_command":
      case "terminal":
        return !!(data.output || data.stdout || data.stderr)
      default:
        return false
    }
  }

  return (
    <div className={`tool-renderer ${status} ${isSuccess ? "success" : ""}`}>
      <div className="tool-content">
        <div className="tool-header">
          <div className="tool-info">
            {renderIcon()}
            <span className="tool-title">{config.name}</span>
            {status === "error" && <span className="tool-status">Error</span>}
          </div>
          <div className="tool-controls">
            <span className="tool-timestamp">{formatTimestamp(timestamp)}</span>
            {hasDetails() && (
              <button 
                className={`expand-button ${isExpanded ? "expanded" : ""}`} 
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? "Ocultar" : "Mostrar"} detalles
              </button>
            )}
          </div>
        </div>
        {renderSummary()}
        {renderDetails()}
      </div>
    </div>
  )
}

export default ToolRenderer