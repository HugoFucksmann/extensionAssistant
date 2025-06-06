import type React from "react"

interface SearchToolProps {
  toolInput?: { query?: string; limit?: number }
  toolOutput?: { results?: Array<{ title: string; url: string; snippet: string }> }
  status?: string
  isSuccess?: boolean
}

export const SearchTool: React.FC<SearchToolProps> = ({ toolInput, toolOutput, status, isSuccess }) => {
  const query = toolInput?.query || ""
  const results = toolOutput?.results || []

  return (
    <div className="search-tool">
      <div className="tool-input">
        <h4>Consulta de búsqueda:</h4>
        <p className="search-query">"{query}"</p>
      </div>

      {isSuccess && results.length > 0 && (
        <div className="tool-output">
          <h4>Resultados encontrados ({results.length}):</h4>
          <div className="search-results">
            {results.map((result, index) => (
              <div key={index} className="search-result">
                <h5>{result.title}</h5>
                <p className="result-url">{result.url}</p>
                <p className="result-snippet">{result.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
