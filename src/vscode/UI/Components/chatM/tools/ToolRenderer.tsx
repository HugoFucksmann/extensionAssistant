import type React from "react"
import { ToolRendererBase } from "./ToolRendererBase"
import { SearchTool } from "./SearchTool"
import { FileExamineTool } from "./FileExamineTool"
import { FileEditTool } from "./FileEditTool"
import { ProjectSearchTool } from "./ProjectSearchTool"
import { ConsoleCommandTool } from "./ConsoleCommandTool"
import { GitStatusTool } from "./GitStatusTool"
import { ProjectSummaryTool } from "./ProjectSummaryTool"

interface ToolRendererProps {
  toolName: string
  toolInput?: Record<string, any>
  toolOutput?: any
  status?: string
  success?: boolean
  message?: string
  timestamp?: number
  isFinalResponse?: boolean
}

// Mapeo de herramientas a sus componentes
const TOOL_COMPONENTS: Record<string, React.ComponentType<any>> = {
  search: SearchTool,
  file_examine: FileExamineTool,
  file_read: FileExamineTool,
  getFileContents: FileExamineTool,
  file_edit: FileEditTool,
  file_write: FileEditTool,
  project_search: ProjectSearchTool,
  console_command: ConsoleCommandTool,
  terminal: ConsoleCommandTool,
  getGitStatus: GitStatusTool,
  getProjectSummary: ProjectSummaryTool,
}

export const ToolRenderer: React.FC<ToolRendererProps> = ({
  toolName,
  toolInput = {},
  toolOutput,
  status = "thinking",
  success,
  message,
  timestamp,
  isFinalResponse = false,
}) => {
  const ToolComponent = TOOL_COMPONENTS[toolName]
  const isSuccess = success !== undefined ? success : status === "success" || toolOutput?.success

  // Renderizar mensaje de error si no hay componente para la herramienta
  if (!ToolComponent) {
    return (
      <ToolRendererBase
        toolName={toolName}
        toolInput={toolInput}
        toolOutput={toolOutput}
        status={status}
        success={success}
        message={message}
        timestamp={timestamp}
      >
        <div className="tool-not-supported">
          <div className="not-supported-content">
            <h4>Herramienta no soportada</h4>
            <p>Esta herramienta no tiene una vista personalizada disponible.</p>
            <div className="tool-details">
              <p>
                <strong>Herramienta:</strong> <code>{toolName}</code>
              </p>
              {message && (
                <p>
                  <strong>Mensaje:</strong> {message}
                </p>
              )}
              {toolOutput?.error && (
                <div className="error-details">
                  <strong>Error:</strong> {toolOutput.error}
                </div>
              )}
            </div>
          </div>
        </div>
      </ToolRendererBase>
    )
  }

  // Renderizar el componente de la herramienta específica dentro del ToolRendererBase
  return (
    <ToolRendererBase
      toolName={toolName}
      toolInput={toolInput}
      toolOutput={toolOutput}
      status={status}
      success={success}
      message={message}
      timestamp={timestamp}
    >
      <ToolComponent
        toolInput={toolInput}
        toolOutput={toolOutput}
        status={status}
        isSuccess={isSuccess}
        isFinalResponse={isFinalResponse}
      />
    </ToolRendererBase>
  )
}
