import React, { useState } from "react"
import "./styles/ToolRenderer.css"

const ToolRenderer = ({
  toolName,
  toolInput = {},
  toolOutput,
  toolResult = toolOutput,
  status = "thinking",
  success,
  message,
  timestamp,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDiff, setShowDiff] = useState(false)

  const result = toolResult || { success: false, data: {}, error: null }
  const isSuccess = success !== undefined ? success : (status === "success" || result.success)
  const errorMessage = message || result.error || ""

  const formatTimestamp = (ts) => {
    const time = ts && !isNaN(ts) ? new Date(ts) : new Date()
    return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const toolConfig = {
    search: {
      name: "Búsqueda Web",
      icon: "search"
    },
    file_examine: {
      name: "Examinar Archivo",
      icon: "file"
    },
    file_read: {
      name: "Examinar Archivo", 
      icon: "file"
    },
    file_edit: {
      name: "Editar Archivo",
      icon: "edit"
    },
    file_write: {
      name: "Editar Archivo",
      icon: "edit"
    },
    project_search: {
      name: "Búsqueda en Proyecto",
      icon: "folder-opened"
    },
    console_command: {
      name: "Comando de Consola",
      icon: "terminal"
    },
    terminal: {
      name: "Comando de Consola",
      icon: "terminal"
    }
  }

  const config = toolConfig[toolName] || {
    name: toolName || "Herramienta",
    icon: "M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"
  }

  const renderIcon = () => {
    const iconClass = (status === "thinking" || status === "tool_executing") ? "tool-icon processing" : "tool-icon"
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
        <path d={config.icon} />
      </svg>
    )
  }

  const renderSummary = () => {
    if (!isSuccess) {
      return <div className="tool-error"><span className="error-message">{errorMessage || 'Error al ejecutar la herramienta'}</span></div>
    }

    const data = result.data || {}
    const getCount = (arr) => Array.isArray(arr) ? arr.length : (data.count || 0)

    switch (toolName) {
      case "search":
        return (
          <div className="tool-summary">
            <span className="tool-query">"{toolInput.query || toolInput.q || "Búsqueda"}"</span>
            {data.results && <span className="tool-results">{getCount(data.results)} resultados</span>}
          </div>
        )

      case "file_examine":
      case "file_read":
        return (
          <div className="tool-summary">
            <span className="tool-file">{toolInput.file || toolInput.path || "archivo"}</span>
            {data.size && <span className="file-size">{data.size}</span>}
            {data.type && <span className="file-type">{data.type}</span>}
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
            {data.matches && <span className="tool-matches">{getCount(data.matches)} coincidencias</span>}
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
        return (
          <div className="tool-summary">
            <span>{errorMessage || `Ejecutando ${toolName}...`}</span>
          </div>
        )
    }
  }

  const renderFileContent = (content, language = "typescript") => {
    if (!content) {
      return (
        <div className="file-content">
          <div className="file-header">
            <span className="file-language">{language}</span>
            <span className="file-lines">Sin contenido</span>
          </div>
          <div className="code-content">
            <pre><code><div className="code-line"><span className="line-number">1</span><span className="line-content">// Archivo vacío</span></div></code></pre>
          </div>
        </div>
      )
    }

    const lines = content.split("\n")
    return (
      <div className="file-content">
        <div className="file-header">
          <span className="file-language">{language}</span>
          <span className="file-lines">{lines.length} líneas</span>
        </div>
        <div className="code-content">
          <pre>
            <code>
              {lines.map((line, index) => (
                <div key={index} className="code-line">
                  <span className="line-number">{index + 1}</span>
                  <span className="line-content">{line}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    )
  }

  const renderDetails = () => {
    if (!isExpanded) return null

    const output = toolResult || {}
    const data = output.data || {}

    switch (toolName) {
      case "file_examine":
      case "file_read":
        return (
          <div className="tool-details">
            {toolInput.path && <div className="detail-item"><span className="detail-label">Ruta:</span><span className="detail-value">{toolInput.path}</span></div>}
            {output.content && isSuccess && (
              <div className="file-preview">
                <div className="preview-header"><span>Vista previa del archivo:</span></div>
                {renderFileContent(output.content, output.language)}
              </div>
            )}
          </div>
        )

      case "file_edit":
      case "file_write":
        return (
          <div className="tool-details">
            {output.diff && Array.isArray(output.diff) && isSuccess && (
              <div className="diff-container">
                <div className="diff-header">
                  <span>Cambios realizados:</span>
                  <button className={`diff-toggle ${showDiff ? "active" : ""}`} onClick={() => setShowDiff(!showDiff)}>
                    {showDiff ? "Ocultar diff" : "Mostrar diff"}
                  </button>
                </div>
                {showDiff && (
                  <div className="diff-content">
                    {output.diff.map((line, index) => (
                      <div key={index} className={`diff-line ${line.type || "context"}`}>
                        <span className="line-number">{line.lineNumber || ""}</span>
                        <span className="line-content">{line.content || ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case "project_search":
        return (
          <div className="tool-details">
            {output.matches && Array.isArray(output.matches) && isSuccess && (
              <div className="search-results">
                <div className="results-header"><span>Resultados encontrados:</span></div>
                <div className="results-list">
                  {output.matches.slice(0, 10).map((match, index) => (
                    <div key={index} className="result-item">
                      <span className="result-file">{match.file || match.path}</span>
                      {match.line && <span className="result-line">:{match.line}</span>}
                    </div>
                  ))}
                  {output.matches.length > 10 && (
                    <div className="result-item more-results">... y {output.matches.length - 10} más</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )

      case "console_command":
      case "terminal":
        return (
          <div className="console-output">
            <div className="console-header"><span>Salida del comando:</span></div>
            <div className="console-content">
              <pre>{output.output || output.stdout || "Sin salida disponible"}</pre>
              {output.stderr && (
                <div className="console-error">
                  <div className="error-header">Error:</div>
                  <pre>{output.stderr}</pre>
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
    const data = result.data || {}
    const output = toolResult || {}
    
    switch (toolName) {
      case "file_examine":
      case "file_read":
        return toolInput.path || output.content
      case "file_edit":
      case "file_write":
        return output.diff
      case "project_search":
        return output.matches
      case "console_command":
      case "terminal":
        return output.output || output.stdout || output.stderr
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
              <button className={`expand-button ${isExpanded ? "expanded" : ""}`} onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? "Ocultar detalles" : "Mostrar detalles"}
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