import React from "react"

const GitStatusTool = ({ toolInput, toolOutput, status, isSuccess }) => {
  if (!isSuccess || !toolOutput?.items?.[0]) {
    return (
      <div className="git-status-error">
        <p>Error obteniendo el estado de Git</p>
        {toolOutput?.error && <p className="error-details">{toolOutput.error}</p>}
      </div>
    )
  }

  const gitData = toolOutput.items[0]
  const { 
    currentBranch, 
    remoteTracking, 
    changedFilesCount, 
    stagedFilesCount, 
    unstagedFilesCount, 
    untrackedFilesCount,
    conflictedFilesCount,
    files = [] 
  } = gitData

  const getFileStatusIcon = (file) => {
    if (file.workTreeStatus === 'M') return '📝'
    if (file.workTreeStatus === 'A') return '➕'
    if (file.workTreeStatus === 'D') return '❌'
    if (file.workTreeStatus === '?') return '❓'
    return '📄'
  }

  const getFileStatusText = (file) => {
    if (file.workTreeStatus === 'M') return 'Modificado'
    if (file.workTreeStatus === 'A') return 'Agregado'
    if (file.workTreeStatus === 'D') return 'Eliminado'
    if (file.workTreeStatus === '?') return 'Sin seguimiento'
    return 'Sin cambios'
  }

  return (
    <div className="git-status-tool">
      <style jsx>{`
        .git-status-tool {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin: 8px 0;
        }

        .git-branch-info {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding: 12px;
          background: #e3f2fd;
          border-radius: 6px;
          border-left: 4px solid #2196f3;
        }

        .branch-name {
          font-weight: 600;
          color: #1976d2;
          font-size: 16px;
        }

        .remote-status {
          display: flex;
          gap: 8px;
          font-size: 12px;
          color: #666;
        }

        .status-badge {
          background: #e8f5e8;
          color: #2e7d32;
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .stat-item {
          text-align: center;
          padding: 8px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
        }

        .stat-number {
          font-size: 20px;
          font-weight: bold;
          color: #333;
        }

        .stat-label {
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .files-section {
          margin-top: 16px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .file-list {
          max-height: 200px;
          overflow-y: auto;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          margin: 2px 0;
          background: white;
          border-radius: 4px;
          border: 1px solid #f0f0f0;
          font-size: 13px;
        }

        .file-icon {
          font-size: 14px;
        }

        .file-path {
          font-family: 'Monaco', 'Menlo', monospace;
          color: #333;
          flex: 1;
        }

        .file-status {
          font-size: 11px;
          color: #666;
          background: #f5f5f5;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .no-changes {
          text-align: center;
          color: #666;
          padding: 24px;
          font-style: italic;
        }

        .git-status-error {
          color: #d32f2f;
          padding: 12px;
          background: #ffebee;
          border-radius: 6px;
          border-left: 4px solid #d32f2f;
        }

        .error-details {
          margin-top: 8px;
          font-size: 12px;
          opacity: 0.8;
        }
      `}</style>

      <div className="git-branch-info">
        <span className="branch-name">🌿 {currentBranch}</span>
        <div className="remote-status">
          {remoteTracking.ahead === 0 && remoteTracking.behind === 0 ? (
            <span className="status-badge">Sincronizado</span>
          ) : (
            <>
              {remoteTracking.ahead > 0 && (
                <span className="status-badge">↑ {remoteTracking.ahead} por delante</span>
              )}
              {remoteTracking.behind > 0 && (
                <span className="status-badge">↓ {remoteTracking.behind} por detrás</span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-number">{changedFilesCount}</div>
          <div className="stat-label">Modificados</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{stagedFilesCount}</div>
          <div className="stat-label">Preparados</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{untrackedFilesCount}</div>
          <div className="stat-label">Sin seguimiento</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{conflictedFilesCount}</div>
          <div className="stat-label">Conflictos</div>
        </div>
      </div>

      {files.length > 0 ? (
        <div className="files-section">
          <div className="section-title">
            📁 Archivos ({files.length})
          </div>
          <div className="file-list">
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <span className="file-icon">{getFileStatusIcon(file)}</span>
                <span className="file-path">{file.path}</span>
                <span className="file-status">{getFileStatusText(file)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-changes">
          ✨ Directorio de trabajo limpio
        </div>
      )}
    </div>
  )
}

export default GitStatusTool