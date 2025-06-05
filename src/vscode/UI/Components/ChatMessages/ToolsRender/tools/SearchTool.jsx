import React from "react"

const SearchTool = ({ toolInput, toolOutput, status, isSuccess }) => {
  const query = toolInput?.query || toolInput?.q || ""
  const results = toolOutput?.results || toolOutput?.data?.results || []
  const error = toolOutput?.error || toolOutput?.message

  if (!isSuccess) {
    return (
      <div className="tool-error">
        {error || "Error al realizar la búsqueda"}
      </div>
    )
  }

  return (
    <div className="search-tool">
      <div className="search-query">
        <strong>Consulta:</strong> {query ? `"${query}"` : "No se especificó una consulta"}
      </div>
      
      {results.length > 0 ? (
        <div className="search-results">
          <div className="results-count">
            {results.length} {results.length === 1 ? 'resultado' : 'resultados'} encontrados
          </div>
          <div className="results-list">
            {results.slice(0, 5).map((result, index) => (
              <div key={index} className="result-item">
                {result.title && <div className="result-title">{result.title}</div>}
                {result.snippet && <div className="result-snippet">{result.snippet}</div>}
                {result.url && (
                  <a 
                    href={result.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="result-link"
                  >
                    {new URL(result.url).hostname}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-results">No se encontraron resultados para la búsqueda.</div>
      )}
    </div>
  )
}

export default SearchTool
