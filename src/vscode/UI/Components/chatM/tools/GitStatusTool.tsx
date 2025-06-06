import type React from "react"

interface GitStatusToolProps {
  toolInput?: Record<string, any>
  toolOutput?: {
    currentBranch?: string
    files?: Array<{ path: string; status: string; description: string }>
    changedFilesCount?: number
  }
  status?: string
  isSuccess?: boolean
}

export const GitStatusTool: React.FC<GitStatusToolProps> = ({ toolInput, toolOutput, status, isSuccess }) => {
  const currentBranch = toolOutput?.currentBranch || ""
  const files = toolOutput?.files || []
  const changedFilesCount = toolOutput?.changedFilesCount || 0

  return (
    <div className="git-status-tool">
      {isSuccess && (
        <div className="tool-output">
          <div className="git-info">
            <p>
              <strong>Rama actual:</strong> {currentBranch}
            </p>
            <p>
              <strong>Archivos modificados:</strong> {changedFilesCount}
            </p>
          </div>

          {files.length > 0 && (
            <div className="git-files">
              <h4>Estado de archivos:</h4>
              {files.map((file, index) => (
                <div key={index} className="git-file">
                  <span className="file-status">{file.status}</span>
                  <span className="file-path">{file.path}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
