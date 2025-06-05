import React from "react"

const FileExamineTool = ({ toolInput, toolOutput, status, isSuccess }) => {
  // Para getFileContents, extraer de items[0]
  const firstItem = toolOutput?.items?.[0]
  
  const filePath = toolInput?.file || toolInput?.path ||
                  firstItem?.filePath || ""
  
  const content = toolOutput?.content || toolOutput?.data?.content ||
                 firstItem?.content || ""
  
  const error = toolOutput?.error || toolOutput?.message
  
  const fileSize = toolOutput?.size || toolOutput?.data?.size ||
                  firstItem?.fileSize
  
  const lastModified = firstItem?.lastModified
  const lineCount = firstItem?.lineCount
  const mimeType = firstItem?.mimeType
  const isBinary = firstItem?.isBinary

  if (!isSuccess) {
    return (
      <div className="tool-error">
        {error || "Error al examinar el archivo"}
      </div>
    )
  }

  return (
    <div className="file-examine-tool">
      <div className="file-info">
        <div className="file-path">
          <strong>Archivo:</strong> {filePath || "Sin ruta especificada"}
        </div>
        {fileSize && (
          <div className="file-size">
            <strong>Tamaño:</strong> {formatFileSize(fileSize)}
          </div>
        )}
        {lineCount && (
          <div className="line-count">
            <strong>Líneas:</strong> {lineCount}
          </div>
        )}
        {mimeType && (
          <div className="mime-type">
            <strong>Tipo:</strong> {mimeType}
          </div>
        )}
        {lastModified && (
          <div className="last-modified">
            <strong>Modificado:</strong> {new Date(lastModified).toLocaleString()}
          </div>
        )}
      </div>
      
      {content && !isBinary && (
        <div className="file-preview">
          <div className="preview-header">Contenido:</div>
          <div className="code-content">
            <pre><code>{content}</code></pre>
          </div>
        </div>
      )}
      
      {isBinary && (
        <div className="binary-notice">
          <p>Este archivo es binario y no se puede mostrar como texto.</p>
        </div>
      )}
    </div>
  )
}

// Función auxiliar para formatear el tamaño del archivo
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default FileExamineTool