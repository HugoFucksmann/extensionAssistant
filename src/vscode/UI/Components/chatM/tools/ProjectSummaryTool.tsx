import type React from "react"

interface ProjectSummaryToolProps {
  toolInput?: Record<string, any>
  toolOutput?: {
    projectName?: string
    rootPath?: string
    topLevelStructure?: Array<{ name: string; type: string }>
    detectedPrimaryLanguage?: string
  }
  status?: string
  isSuccess?: boolean
}

export const ProjectSummaryTool: React.FC<ProjectSummaryToolProps> = ({ toolInput, toolOutput, status, isSuccess }) => {
  const projectName = toolOutput?.projectName || ""
  const rootPath = toolOutput?.rootPath || ""
  const structure = toolOutput?.topLevelStructure || []
  const primaryLanguage = toolOutput?.detectedPrimaryLanguage || ""

  return (
    <div className="project-summary-tool">
      {isSuccess && (
        <div className="tool-output">
          <div className="project-info">
            <h4>Información del proyecto:</h4>
            <p>
              <strong>Nombre:</strong> {projectName}
            </p>
            <p>
              <strong>Ruta:</strong> {rootPath}
            </p>
            <p>
              <strong>Lenguaje principal:</strong> {primaryLanguage}
            </p>
          </div>

          {structure.length > 0 && (
            <div className="project-structure">
              <h4>Estructura del proyecto:</h4>
              <ul className="structure-list">
                {structure.map((item, index) => (
                  <li key={index} className={`structure-item ${item.type}`}>
                    <span className="item-icon">{item.type === "directory" ? "📁" : "📄"}</span>
                    {item.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
