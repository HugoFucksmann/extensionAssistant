
import React, { useState } from "react"
import "../styles/ToolRenderer.css"



const ToolRenderer = ({
  toolName,
  toolInput,
  toolOutput, // Mantener para compatibilidad hacia atrás
  toolResult = toolOutput, // Nueva prop con valor por defecto
  status,
  success,
  message,
  timestamp,
  isFinalResponse,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDiff, setShowDiff] = useState(false)

  // Validaciones de datos
  const safeToolInput = toolInput || {}
  const safeToolResult = toolResult || { success: false, data: {}, error: null }
  const safeStatus = status || "thinking"
  const safeMessage = message || safeToolResult.error || ""
  const safeTimestamp = timestamp || Date.now()
  const isSuccess = success !== undefined ? success : 
    (safeStatus === "success" || safeToolResult.success === true)

  const formatTimestamp = (ts) => {
    if (!ts || isNaN(ts)) {
      return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    }
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getToolIcon = (tool) => {
    const iconClass =
      safeStatus === "thinking" || safeStatus === "tool_executing" ? "tool-icon processing" : "tool-icon"

    switch (tool) {
      case "search":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        )
      case "file_examine":
      case "file_read":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        )
      case "file_edit":
      case "file_write":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
        )
      case "project_search":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z" />
          </svg>
        )
      case "console_command":
      case "terminal":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M20,19V7H4V19H20M20,3A2,2 0 0,1 22,5V19A2,2 0 0,1 20,21H4A2,2 0 0,1 2,19V5C2,3.89 2.9,3 4,3H20M13,17V15H18V17H13M9.58,13L5.57,9H8.4L11.7,12.3C12.09,12.69 12.09,13.33 11.7,13.72L8.42,17H5.59L9.58,13Z" />
          </svg>
        )
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
            <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
          </svg>
        )
    }
  }

  const getToolDisplayName = () => {
    return getDefaultToolName(toolName)
  }

  const getDefaultToolName = (tool) => {
    switch (tool) {
      case "search":
        return "Búsqueda Web"
      case "file_examine":
      case "file_read":
        return "Examinar Archivo"
      case "file_edit":
      case "file_write":
        return "Editar Archivo"
      case "project_search":
        return "Búsqueda en Proyecto"
      case "console_command":
      case "terminal":
        return "Comando de Consola"
      default:
        return toolName || "Herramienta"
    }
  }

  // Solo mostrar estado si hay error
  const shouldShowStatus = () => {
    return safeStatus === "error"
  }

  const getErrorText = () => {
    return "Error"
  }

  const renderDiffLine = (line, index) => {
    if (!line || typeof line !== "object") {
      return null
    }
    const { type = "context", content = "", lineNumber = "" } = line
    return (
      <div key={index} className={`diff-line ${type}`}>
        <span className="line-number">{lineNumber}</span>
        <span className="line-content">{content}</span>
      </div>
    )
  }

  const renderFileContent = (content, language = "typescript") => {
    if (!content || typeof content !== "string") {
      return (
        <div className="file-content">
          <div className="file-header">
            <span className="file-language">{language}</span>
            <span className="file-lines">Sin contenido</span>
          </div>
          <div className="code-content">
            <pre>
              <code>
                <div className="code-line">
                  <span className="line-number">1</span>
                  <span className="line-content">// Archivo vacío o sin contenido disponible</span>
                </div>
              </code>
            </pre>
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

  const renderToolContent = () => {
    // Manejar caso de error
    if (!isSuccess) {
      return (
        <div className="tool-error">
          <span className="error-message">{safeMessage || 'Error al ejecutar la herramienta'}</span>
        </div>
      );
    }

    // Obtener datos del resultado
    const resultData = safeToolResult.data || {};
    
    switch (toolName) {
      case "search":
        return (
          <div className="tool-summary">
            <span className="tool-query">"{safeToolInput.query || safeToolInput.q || "Búsqueda"}"</span>
            {resultData.results && (
              <span className="tool-results">
                {Array.isArray(resultData.results) 
                  ? `${resultData.results.length} resultados`
                  : resultData.count 
                    ? `${resultData.count} resultados`
                    : 'Sin resultados'}
              </span>
            )}
          </div>
        )

      case "file_examine":
      case "file_read":
        return (
          <div className="tool-summary">
            <span className="tool-file">{safeToolInput.file || safeToolInput.path || "archivo"}</span>
            <>
              {resultData.size && <span className="file-size">{resultData.size}</span>}
              {resultData.type && <span className="file-type">{resultData.type}</span>}
            </>
          </div>
        )

      case "file_edit":
      case "file_write":
        return (
          <div className="tool-summary">
            <span className="tool-file">{safeToolInput.file || safeToolInput.path || "archivo"}</span>
            <>
              {(resultData.linesAdded || resultData.linesRemoved) && (
                <span className="tool-changes">
                  +{resultData.linesAdded || 0} -{resultData.linesRemoved || 0}
                </span>
              )}
              {resultData.modifications && (
                <span className="tool-modifications">{resultData.modifications} modificación</span>
              )}
            </>
          </div>
        )

      case "project_search":
        return (
          <div className="tool-summary">
            <span className="tool-pattern">/{safeToolInput.pattern || safeToolInput.query || "patrón"}/</span>
            {resultData.matches && (
              <span className="tool-matches">
                {Array.isArray(resultData.matches)
                  ? `${resultData.matches.length} coincidencias`
                  : resultData.count
                    ? `${resultData.count} coincidencias`
                    : 'Sin coincidencias'}
              </span>
            )}
          </div>
        )

      case "console_command":
      case "terminal":
        return (
          <div className="console-summary">
            <code className="command-line">$ {safeToolInput.command || safeToolInput.cmd || "comando"}</code>
            {resultData.exitCode !== undefined && (
              <span className="exit-code">exit: {resultData.exitCode}</span>
            )}
          </div>
        )

      default:
        return (
          <div className="tool-summary">
            <span>{safeMessage || `Ejecutando ${toolName}...`}</span>
            {resultData && (
              <pre className="raw-data">
                {typeof resultData === 'object' 
                  ? JSON.stringify(resultData, null, 2) 
                  : String(resultData)}
              </pre>
            )}
          </div>
        )
    }
  }

  const renderExpandedContent = () => {
    if (!isExpanded) return null

    switch (toolName) {
      case "file_examine":
      case "file_read":
        return (
          <div className="tool-details">
            {safeToolInput.path && (
              <div className="detail-item">
                <span className="detail-label">Ruta:</span>
                <span className="detail-value">{safeToolInput.path}</span>
              </div>
            )}
            {safeToolOutput.lastModified && (
              <div className="detail-item">
                <span className="detail-label">Última modificación:</span>
                <span className="detail-value">{safeToolOutput.lastModified}</span>
              </div>
            )}
            {safeToolOutput.totalLines && (
              <div className="detail-item">
                <span className="detail-label">Líneas:</span>
                <span className="detail-value">{safeToolOutput.totalLines}</span>
              </div>
            )}
            {safeToolOutput.content && isSuccess && (
              <div className="file-preview">
                <div className="preview-header">
                  <span>Vista previa del archivo:</span>
                </div>
                {renderFileContent(safeToolOutput.content, safeToolOutput.language)}
              </div>
            )}
          </div>
        )

      case "file_edit":
      case "file_write":
        return (
          <div className="tool-details">
            {safeToolInput.operation && (
              <div className="detail-item">
                <span className="detail-label">Operación:</span>
                <span className="detail-value">{safeToolInput.operation}</span>
              </div>
            )}
            {safeToolOutput.affectedLines && (
              <div className="detail-item">
                <span className="detail-label">Líneas afectadas:</span>
                <span className="detail-value">{safeToolOutput.affectedLines}</span>
              </div>
            )}
            {safeToolOutput.diff && Array.isArray(safeToolOutput.diff) && isSuccess && (
              <div className="diff-container">
                <div className="diff-header">
                  <span>Cambios realizados:</span>
                  <div className="diff-controls">
                    <button
                      className={`diff-toggle ${showDiff ? "active" : ""}`}
                      onClick={() => setShowDiff(!showDiff)}
                    >
                      {showDiff ? "Ocultar diff" : "Mostrar diff"}
                    </button>
                  </div>
                </div>
                {showDiff && (
                  <div className="diff-content">
                    {safeToolOutput.diff.map((line, index) => renderDiffLine(line, index))}
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case "project_search":
        return (
          <div className="tool-details">
            {safeToolInput.fileTypes && (
              <div className="detail-item">
                <span className="detail-label">Archivos:</span>
                <span className="detail-value">{safeToolInput.fileTypes}</span>
              </div>
            )}
            {safeToolInput.directory && (
              <div className="detail-item">
                <span className="detail-label">Directorio:</span>
                <span className="detail-value">{safeToolInput.directory}</span>
              </div>
            )}
            {safeToolOutput.matches && Array.isArray(safeToolOutput.matches) && isSuccess && (
              <div className="search-results">
                <div className="results-header">
                  <span>Resultados encontrados:</span>
                </div>
                <div className="results-list">
                  {safeToolOutput.matches.slice(0, 10).map((match, index) => (
                    <div key={index} className="result-item">
                      <span className="result-file">{match.file || match.path}</span>
                      {match.line && <span className="result-line">:{match.line}</span>}
                    </div>
                  ))}
                  {safeToolOutput.matches.length > 10 && (
                    <div className="result-item more-results">... y {safeToolOutput.matches.length - 10} más</div>
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
            <div className="console-header">
              <span>Salida del comando:</span>
              {safeToolOutput.duration && <span className="console-time">{safeToolOutput.duration}</span>}
            </div>
            <div className="console-content">
              <pre>{safeToolOutput.output || safeToolOutput.stdout || "Sin salida disponible"}</pre>
              {safeToolOutput.stderr && (
                <div className="console-error">
                  <div className="error-header">Error:</div>
                  <pre>{safeToolOutput.stderr}</pre>
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Determinar si mostrar botón de expandir
  const hasExpandableContent = () => {
    const resultData = safeToolResult.data || {};
    
    switch (toolName) {
      case "file_examine":
      case "file_read":
        return safeToolInput.path || resultData.content || resultData.totalLines
      case "file_edit":
      case "file_write":
        return safeToolInput.operation || resultData.diff
      case "project_search":
        return safeToolInput.fileTypes || safeToolInput.directory || resultData.matches
      case "console_command":
      case "terminal":
        return resultData.output || resultData.stdout || resultData.stderr
      default:
        return false
    }
  }

  return (
    <div className={`tool-renderer ${safeStatus} ${isSuccess ? "success" : ""}`}>
      <div className="tool-content">
        <div className="tool-header">
          <div className="tool-info">
            {getToolIcon(toolName)}
            <span className="tool-title">{getToolDisplayName()}</span>
            {shouldShowStatus() && <span className="tool-status">{getErrorText()}</span>}
          </div>
          <div className="tool-controls">
            <span className="tool-timestamp">{formatTimestamp(safeTimestamp)}</span>
            {hasExpandableContent() && (
              <button
                className={`expand-button ${isExpanded ? "expanded" : ""}`}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? "Ocultar detalles" : "Mostrar detalles"}
              </button>
            )}
          </div>
        </div>

        {renderToolContent()}
        {renderExpandedContent()}
      </div>
    </div>
  )
}

export default ToolRenderer
