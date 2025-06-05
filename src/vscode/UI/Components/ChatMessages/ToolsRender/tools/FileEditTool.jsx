import React, { useState } from "react"

const FileEditTool = ({ toolInput, toolOutput, status, isSuccess }) => {
  const filePath = toolInput?.file || toolInput?.path || ""
  const diff = toolOutput?.diff || toolOutput?.data?.diff
  const error = toolOutput?.error || toolOutput?.message
  const [showDiff, setShowDiff] = useState(false)
  const linesAdded = toolOutput?.linesAdded || toolOutput?.data?.linesAdded || 0
  const linesRemoved = toolOutput?.linesRemoved || toolOutput?.data?.linesRemoved || 0
  const hasChanges = linesAdded > 0 || linesRemoved > 0

  if (!isSuccess) {
    return (
      <div className="tool-error">
        {error || "Error al editar el archivo"}
      </div>
    )
  }

  return (
    <div className="file-edit-tool">
      <div className="file-info">
        <div className="file-path">
          <strong>Archivo:</strong> {filePath || "Sin ruta especificada"}
        </div>
        {hasChanges && (
          <div className="changes-summary">
            <span className="lines-added">+{linesAdded} líneas añadidas</span>
            <span className="lines-removed">-{linesRemoved} líneas eliminadas</span>
          </div>
        )}
      </div>
      
      {diff && (
        <div className="diff-section">
          <div className="diff-header">
            <span>Cambios realizados:</span>
            <button 
              className={`diff-toggle ${showDiff ? 'active' : ''}`}
              onClick={() => setShowDiff(!showDiff)}
            >
              {showDiff ? 'Ocultar' : 'Mostrar'} diff
            </button>
          </div>
          
          {showDiff && (
            <div className="diff-content">
              <pre><code>{typeof diff === 'string' ? diff : JSON.stringify(diff, null, 2)}</code></pre>
            </div>
          )}
        </div>
      )}
      
      {!hasChanges && !diff && (
        <div className="no-changes">No se realizaron cambios en el archivo.</div>
      )}
    </div>
  )
}

export default FileEditTool
