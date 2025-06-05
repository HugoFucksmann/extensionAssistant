import React, { useState } from "react"

const ConsoleCommandTool = ({ toolInput, toolOutput, status, isSuccess }) => {
  const command = toolInput?.command || toolInput?.cmd || ""
  const output = toolOutput?.output || toolOutput?.stdout
  const error = toolOutput?.error || toolOutput?.stderr || toolOutput?.message
  const exitCode = toolOutput?.exitCode
  const isError = !isSuccess || exitCode !== 0 || !!error
  const [showOutput, setShowOutput] = useState(true)

  return (
    <div className={`console-command-tool ${isError ? 'error' : ''}`}>
      <div className="command-line">
        <span className="prompt">$</span>
        <code>{command || "comando no especificado"}</code>
        {exitCode !== undefined && (
          <span className="exit-code">exit: {exitCode}</span>
        )}
      </div>
      
      {(output || error) && (
        <div className="output-section">
          <div 
            className="output-header"
            onClick={() => setShowOutput(!showOutput)}
          >
            <span>{error ? 'Error' : 'Salida'}:</span>
            <button 
              className={`toggle-button ${showOutput ? 'expanded' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                setShowOutput(!showOutput)
              }}
              aria-expanded={showOutput}
            >
              {showOutput ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          
          {showOutput && (
            <div className={`output-content ${error ? 'error' : ''}`}>
              <pre>{error || output}</pre>
            </div>
          )}
        </div>
      )}
      
      {status === 'thinking' && (
        <div className="executing-message">
          Ejecutando comando...
        </div>
      )}
    </div>
  )
}

export default ConsoleCommandTool
