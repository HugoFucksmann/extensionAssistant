import React from "react"

const ProjectSearchTool = ({ toolInput, toolOutput, status, isSuccess }) => {
  const pattern = toolInput?.pattern || toolInput?.query || ""
  const matches = toolOutput?.matches || toolOutput?.data?.matches || []
  const error = toolOutput?.error || toolOutput?.message
  const totalMatches = matches.length

  if (!isSuccess) {
    return (
      <div className="tool-error">
        {error || "Error al buscar en el proyecto"}
      </div>
    )
  }

  return (
    <div className="project-search-tool">
      <div className="search-info">
        <div className="search-pattern">
          <strong>Patrón de búsqueda:</strong> {pattern ? `"${pattern}"` : "No especificado"}
        </div>
        <div className="results-count">
          {totalMatches} {totalMatches === 1 ? 'coincidencia' : 'coincidencias'} encontrada{totalMatches !== 1 ? 's' : ''}
        </div>
      </div>
      
      {totalMatches > 0 ? (
        <div className="search-results">
          {matches.slice(0, 10).map((match, index) => (
            <div key={index} className="match-item">
              <div className="match-header">
                <span className="file-path">{match.file || 'Sin nombre de archivo'}</span>
                {match.line !== undefined && (
                  <span className="line-number">Línea {match.line + 1}</span>
                )}
              </div>
              {match.preview && (
                <div className="match-preview">
                  <pre>{match.preview}</pre>
                </div>
              )}
            </div>
          ))}
          {totalMatches > 10 && (
            <div className="more-results">
              +{totalMatches - 10} más...
            </div>
          )}
        </div>
      ) : (
        <div className="no-results">No se encontraron coincidencias.</div>
      )}
    </div>
  )
}

export default ProjectSearchTool
