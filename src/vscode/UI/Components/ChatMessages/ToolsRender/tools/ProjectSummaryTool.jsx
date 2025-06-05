import React, { useState } from "react"

const ProjectSummaryTool = ({ toolInput, toolOutput, status, isSuccess }) => {
  const [showStructure, setShowStructure] = useState(true)
  const projectData = toolOutput?.items?.[0]
  const error = toolOutput?.error || toolOutput?.message

  if (!isSuccess) {
    return (
      <div className="tool-error">
        {error || "Error al obtener el resumen del proyecto"}
      </div>
    )
  }

  if (!projectData) {
    return (
      <div className="no-project-data">
        No se encontraron datos del proyecto.
      </div>
    )
  }

  const {
    projectName,
    rootPath,
    workspaceName,
    topLevelStructure = [],
    detectedPrimaryLanguage
  } = projectData

  const getFileIcon = (type) => {
    return type === "directory" ? "📁" : "📄"
  }

  const getLanguageIcon = (language) => {
    const icons = {
      javascript: "🟨",
      typescript: "🔷",
      python: "🐍",
      java: "☕",
      csharp: "🟦",
      cpp: "⚡",
      go: "🐹",
      rust: "🦀",
      php: "🐘",
      ruby: "💎",
      swift: "🍎",
      kotlin: "🟣"
    }
    return icons[language?.toLowerCase()] || "💻"
  }

  return (
    <div className="project-summary-tool">
      <style jsx>{`
        .project-summary-tool {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin: 8px 0;
        }

        .project-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding: 12px;
          background: #e8f5e8;
          border-radius: 6px;
          border-left: 4px solid #4caf50;
        }

        .project-icon {
          font-size: 24px;
        }

        .project-info h3 {
          margin: 0;
          color: #2e7d32;
          font-size: 18px;
        }

        .project-path {
          font-size: 12px;
          color: #666;
          font-family: 'Monaco', 'Menlo', monospace;
          margin-top: 2px;
        }

        .project-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .detail-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 12px;
        }

        .detail-label {
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 4px;
          font-weight: 600;
        }

        .detail-value {
          font-size: 14px;
          color: #333;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .language-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #e3f2fd;
          color: #1976d2;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .structure-section {
          margin-top: 16px;
        }

        .section-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #e0e0e0;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .toggle-button {
          background: none;
          border: none;
          color: #1976d2;
          font-size: 12px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .toggle-button:hover {
          background: #f0f0f0;
        }

        .structure-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
        }

        .structure-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: white;
          border: 1px solid #f0f0f0;
          border-radius: 4px;
          font-size: 13px;
        }

        .structure-item.directory {
          font-weight: 500;
          color: #1976d2;
        }

        .structure-item.file {
          color: #666;
        }

        .item-icon {
          font-size: 14px;
        }

        .item-name {
          font-family: 'Monaco', 'Menlo', monospace;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .empty-structure {
          text-align: center;
          color: #666;
          padding: 24px;
          font-style: italic;
        }

        .tool-error {
          color: #d32f2f;
          padding: 12px;
          background: #ffebee;
          border-radius: 6px;
          border-left: 4px solid #d32f2f;
        }

        .no-project-data {
          text-align: center;
          color: #666;
          padding: 24px;
          font-style: italic;
        }
      `}</style>

      <div className="project-header">
        <div className="project-icon">🚀</div>
        <div className="project-info">
          <h3>{projectName || workspaceName || "Proyecto"}</h3>
          <div className="project-path">{rootPath}</div>
        </div>
      </div>

      <div className="project-details">
        {workspaceName && (
          <div className="detail-card">
            <div className="detail-label">Workspace</div>
            <div className="detail-value">{workspaceName}</div>
          </div>
        )}
        
        {detectedPrimaryLanguage && (
          <div className="detail-card">
            <div className="detail-label">Lenguaje Principal</div>
            <div className="detail-value">
              <span className="language-badge">
                {getLanguageIcon(detectedPrimaryLanguage)}
                {detectedPrimaryLanguage}
              </span>
            </div>
          </div>
        )}

        <div className="detail-card">
          <div className="detail-label">Elementos</div>
          <div className="detail-value">
            {topLevelStructure.length} archivo{topLevelStructure.length !== 1 ? 's' : ''} y carpetas
          </div>
        </div>
      </div>

      {topLevelStructure.length > 0 && (
        <div className="structure-section">
          <div className="section-header">
            <div className="section-title">
              📂 Estructura del Proyecto
            </div>
            <button 
              className="toggle-button"
              onClick={() => setShowStructure(!showStructure)}
            >
              {showStructure ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          
          {showStructure && (
            <div className="structure-grid">
              {topLevelStructure.map((item, index) => (
                <div 
                  key={index} 
                  className={`structure-item ${item.type}`}
                >
                  <span className="item-icon">
                    {getFileIcon(item.type)}
                  </span>
                  <span className="item-name" title={item.name}>
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {topLevelStructure.length === 0 && (
        <div className="empty-structure">
          No se encontraron archivos en la estructura del proyecto
        </div>
      )}
    </div>
  )
}

export default ProjectSummaryTool