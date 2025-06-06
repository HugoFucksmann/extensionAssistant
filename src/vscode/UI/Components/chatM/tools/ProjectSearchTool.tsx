import type React from "react"

interface ProjectSearchToolProps {
  toolInput?: { query?: string; fileTypes?: string[] }
  toolOutput?: { matches?: Array<{ file: string; line: number; content: string }> }
  status?: string
  isSuccess?: boolean
}

export const ProjectSearchTool: React.FC<ProjectSearchToolProps> = ({ toolInput, toolOutput, status, isSuccess }) => {
  const query = toolInput?.query || ""
  const matches = toolOutput?.matches || []

  return (
    <div className="project-search-tool">
      <div className="tool-input">
        <h4>Búsqueda en proyecto:</h4>
        <p className="search-query">"{query}"</p>
      </div>

      {isSuccess && matches.length > 0 && (
        <div className="tool-output">
          <h4>Coincidencias encontradas ({matches.length}):</h4>
          <div className="search-matches">
            {matches.map((match, index) => (
              <div key={index} className="search-match">
                <div className="match-location">
                  {match.file}:{match.line}
                </div>
                <pre className="match-content">{match.content}</pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
