// ToolRendererBase.jsx
import React, { useState } from "react"
import "../styles/ToolRenderer.css"

const TOOL_CONFIG = {
  search: { name: "Búsqueda Web", icon: "search" },
  file_examine: { name: "Examinar Archivo", icon: "file" },
  file_read: { name: "Examinar Archivo", icon: "file" },
  getFileContents: { name: "Obtener Contenidos", icon: "file" },
  file_edit: { name: "Editar Archivo", icon: "edit" },
  file_write: { name: "Editar Archivo", icon: "edit" },
  project_search: { name: "Búsqueda en Proyecto", icon: "folder-search" },
  console_command: { name: "Comando de Consola", icon: "terminal" },
  terminal: { name: "Terminal", icon: "terminal" },
  getGitStatus: { name: "Estado de Git", icon: "git-branch" },
  getProjectSummary: { name: "Resumen del Proyecto", icon: "project" }
}

const formatTimestamp = (ts) => {
  const time = ts && !isNaN(ts) ? new Date(ts) : new Date()
  return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const ToolRendererBase = ({
  toolName,
  toolInput = {},
  toolOutput,
  status = "thinking",
  success,
  message,
  timestamp,
  children
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = TOOL_CONFIG[toolName] || { name: toolName || "Herramienta", icon: "tools" }
  const isSuccess = success !== undefined ? success : (status === "success" || toolOutput?.success)
  const hasDetails = React.Children.count(children) > 0

  const renderIcon = () => {
    const isProcessing = status === "thinking" || status === "tool_executing"
    return (
      <div className={`codicon codicon-${config.icon} tool-icon ${isProcessing ? "processing" : ""}`} />
    )
  }

  const renderStatus = () => {
    if (status === "error" || (success === false)) {
      return <span className="tool-status error">Error</span>
    }
    if (status === "success" || success === true) {
      return <span className="tool-status success">Listo</span>
    }
    return <span className="tool-status processing">Procesando...</span>
  }

  return (
    <div className={`tool-renderer ${status} ${isSuccess ? "success" : ""}`}>
      <div className="tool-content">
        <div className="tool-header" onClick={() => hasDetails && setIsExpanded(!isExpanded)}>
          <div className="tool-info">
            {renderIcon()}
            <span className="tool-title">{config.name}</span>
            {renderStatus()}
          </div>
          <div className="tool-controls">
            <span className="tool-timestamp">{formatTimestamp(timestamp)}</span>
            {hasDetails && (
              <button 
                className={`expand-button ${isExpanded ? "expanded" : ""}`} 
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(!isExpanded)
                }}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? "Ocultar detalles" : "Mostrar detalles"}
              >
                {isExpanded ? "Ocultar" : "Mostrar"} detalles
              </button>
            )}
          </div>
        </div>
        
        {isExpanded && hasDetails && (
          <div className="tool-details">
            {React.Children.map(children, child => 
              React.cloneElement(child, { 
                toolInput, 
                toolOutput, 
                status, 
                isSuccess 
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ToolRendererBase