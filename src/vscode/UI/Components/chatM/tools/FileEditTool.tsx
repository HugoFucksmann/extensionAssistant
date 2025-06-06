import type React from "react"

interface FileEditToolProps {
  toolInput?: { filePath?: string; content?: string }
  toolOutput?: { success?: boolean; bytesWritten?: number }
  status?: string
  isSuccess?: boolean
}

export const FileEditTool: React.FC<FileEditToolProps> = ({ toolInput, toolOutput, status, isSuccess }) => {
  const filePath = toolInput?.filePath || ""
  const bytesWritten = toolOutput?.bytesWritten || 0

  return (
    <div className="file-edit-tool">
      <div className="tool-input">
        <h4>Archivo editado:</h4>
        <p className="file-path">{filePath}</p>
      </div>

      {isSuccess && (
        <div className="tool-output">
          <p className="edit-success">✅ Archivo guardado exitosamente ({bytesWritten} bytes escritos)</p>
        </div>
      )}
    </div>
  )
}
