import React from "react"
import ToolRendererBase from "./ToolRendererBase"

// Importar componentes específicos de herramientas
import SearchTool from "./tools/SearchTool"
import FileExamineTool from "./tools/FileExamineTool"
import FileEditTool from "./tools/FileEditTool"
import ProjectSearchTool from "./tools/ProjectSearchTool"
import ConsoleCommandTool from "./tools/ConsoleCommandTool"
import GitStatusTool from "./tools/GitStatusTool"
import ProjectSummaryTool from "./tools/ProjectSummaryTool"

// Mapeo de herramientas a sus componentes
const TOOL_COMPONENTS = {
  search: SearchTool,
  file_examine: FileExamineTool,
  file_read: FileExamineTool,
  getFileContents: FileExamineTool,  // Agregar mapeo para getFileContents
  file_edit: FileEditTool,
  file_write: FileEditTool,
  project_search: ProjectSearchTool,
  console_command: ConsoleCommandTool,
  terminal: ConsoleCommandTool,
  getGitStatus: GitStatusTool,  // Agregar mapeo para getGitStatus
  getProjectSummary: ProjectSummaryTool  // Agregar mapeo para getProjectSummary
}

const ToolRenderer = ({
  toolName,
  toolInput = {},
  toolOutput,
  status = "thinking",
  success,
  message,
  timestamp
}) => {
  const ToolComponent = TOOL_COMPONENTS[toolName]
  const isSuccess = success !== undefined ? success : (status === "success" || toolOutput?.success)

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
          <p>Esta herramienta no tiene una vista personalizada.</p>
          <p>Herramienta: <code>{toolName}</code></p>
          {message && <p className="error-message">{message}</p>}
          {toolOutput?.error && <p className="error-message">{toolOutput.error}</p>}
        </div>
      </ToolRendererBase>
    )
  }

  const config = {
    name: toolName || "Herramienta",
    icon: "tools"
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
      />
    </ToolRendererBase>
  )
}

export default ToolRenderer