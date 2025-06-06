import type React from "react"

interface FileExamineToolProps {
  toolInput?: { filePath?: string }
  toolOutput?: {
    content?: string
    fileSize?: number
    lineCount?: number
    encoding?: string
  }
  status?: string
  isSuccess?: boolean
}

export const FileExamineTool: React.FC<FileExamineToolProps> = ({ toolInput, toolOutput, status, isSuccess }) => {
  const filePath = toolInput?.filePath || ""
  const content = toolOutput?.content || ""
  const fileSize = toolOutput?.fileSize || 0
  const lineCount = toolOutput?.lineCount || 0

  return (
    <div className="file-examine-tool">
      <div className="tool-input">
        <h4>Archivo examinado:</h4>
        <p className="file-path">{filePath}</p>
      </div>

      {isSuccess && (
        <div className="tool-output">
          <div className="file-info">
            <span>Tamaño: {fileSize} bytes</span>
            <span>Líneas: {lineCount}</span>
          </div>

          {content && (
            <div className="file-content">
              <h4>Contenido:</h4>
              <pre className="code-block">{content}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
