import React, {  useState } from "react"
import { getToolDefinition } from "../data/toolOutputs"
import "../styles/ToolRenderer.css"

interface ToolChildProps {
  toolInput?: Record<string, any>;
  toolOutput?: any;
  status?: string;
  isSuccess?: boolean;
  [key: string]: any; // Allow any additional props
}

interface ToolRendererBaseProps {
  toolName: string
  toolInput?: Record<string, any>
  toolOutput?: any
  status?: string
  success?: boolean
  message?: string
  timestamp?: number
  children?: React.ReactNode
}

const formatTimestamp = (ts?: number): string => {
  const time = ts && !isNaN(ts) ? new Date(ts) : new Date()
  return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

// CAMBIO: La función ahora genera textos para diferentes estados (ejecutando, éxito, error)
const getActionText = (
  toolName: string,
  toolInput: Record<string, any> | undefined,
  status: string,
  isSuccess: boolean
): string => {
  const definition = getToolDefinition(toolName)
  const baseAction = definition?.displayName || toolName
  const isProcessing = status === "thinking" || status === "tool_executing"

  // Textos base para cada estado
  const stateText = isProcessing ? "Ejecutando" : isSuccess ? "Éxito" : "Error";
  const stateTextVerb = isProcessing ? "Obteniendo" : isSuccess ? "obtenido" : "falló";
  const stateTextVerbPast = isProcessing ? "Examinando" : isSuccess ? "examinado" : "falló al examinar";

  switch (toolName) {
    case "search":
      const query = toolInput?.query || "..."
      return isProcessing ? `Buscando: ${query}` : `Búsqueda para "${query}" finalizada`
    case "file_examine":
    case "file_read":
    case "getFileContents":
      const fileName = toolInput?.filePath?.split("/").pop() || toolInput?.filePath || "archivo"
      return isProcessing ? `Examinando: ${fileName}` : `Archivo ${fileName} ${stateTextVerbPast}`
    case "file_edit":
    case "file_write":
      const editFileName = toolInput?.filePath?.split("/").pop() || toolInput?.filePath || "archivo"
      return isProcessing ? `Editando: ${editFileName}` : `Archivo ${editFileName} editado`
    case "project_search":
      const projectQuery = toolInput?.query || "..."
      return isProcessing ? `Buscando en proyecto: ${projectQuery}` : `Búsqueda en proyecto finalizada`
    case "console_command":
    case "terminal":
      const command = toolInput?.command?.split(" ")[0] || "comando"
      return `${stateText}: ${command}`
    case "getGitStatus":
      return isProcessing ? "Obteniendo estado de Git" : `Estado de Git ${stateTextVerb}`
    case "getProjectSummary":
      return isProcessing ? "Generando resumen del proyecto" : `Resumen del proyecto ${stateTextVerb}`
    default:
      return `${baseAction}: ${stateText.toLowerCase()}`
  }
}

export const ToolRendererBase: React.FC<ToolRendererBaseProps> = ({
  toolName,
  toolInput = {},
  toolOutput,
  status = "thinking",
  success,
  message,
  timestamp,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const isSuccess = success !== undefined ? success : status === "success" || toolOutput?.success
  const isError = status === "error" || success === false
  const isProcessing = status === "thinking" || status === "tool_executing"
  const hasDetails = React.Children.count(children) > 0

  // CAMBIO: El texto de acción ahora es dinámico según el estado
  const actionText = getActionText(toolName, toolInput, status, isSuccess)

  const handleToggleExpand = () => {
    if (hasDetails && !isProcessing) {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <div
      className={`tool-card ${isProcessing ? "processing" : isError ? "error" : "success"} ${isExpanded ? "expanded" : ""}`}
    >
      <div
        className={`tool-card-header ${hasDetails && !isProcessing ? "clickable" : ""}`}
        onClick={handleToggleExpand}
      >
        <div className="tool-main-info">
          {/* CAMBIO: Indicador de estado simplificado. La lógica de estilo está en CSS. */}
          <div className={`status-square ${isProcessing ? "processing" : isError ? "error" : "success"}`} />
          <span className="tool-action-text">{actionText}</span>
        </div>

        <div className="tool-controls">
          <span className="tool-timestamp">{formatTimestamp(timestamp)}</span>

          {hasDetails && !isProcessing && (
            <button
              className={`expand-button ${isExpanded ? "expanded" : ""}`}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Ocultar detalles" : "Mostrar detalles"}
            >
              <span className="expand-icon">{isExpanded ? "−" : "+"}</span>
            </button>
          )}
        </div>
      </div>

      {isExpanded && hasDetails && !isProcessing && (
        <div className="tool-card-content">
          <div className="tool-details-expanded">
            {React.Children.map(children, (child) =>
              React.isValidElement<ToolChildProps>(child)
                ? React.cloneElement(child, {
                    toolInput,
                    toolOutput,
                    status,
                    isSuccess,
                  } as ToolChildProps)
                : child
            )}
          </div>
        </div>
      )}

      {message && !hasDetails && !isProcessing && (
        <div className="tool-card-content">
          <div className="tool-message">{message}</div>
        </div>
      )}
    </div>
  )
}