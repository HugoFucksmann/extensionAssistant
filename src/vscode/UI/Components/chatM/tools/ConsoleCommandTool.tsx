import type React from "react"

interface ConsoleCommandToolProps {
  toolInput?: { command?: string; cwd?: string }
  toolOutput?: {
    output?: string
    errorOutput?: string
    exitCode?: number
    executionTime?: number
  }
  status?: string
  isSuccess?: boolean
}

export const ConsoleCommandTool: React.FC<ConsoleCommandToolProps> = ({ toolInput, toolOutput, status, isSuccess }) => {
  const command = toolInput?.command || ""
  const output = toolOutput?.output || ""
  const errorOutput = toolOutput?.errorOutput || ""
  const exitCode = toolOutput?.exitCode || 0

  return (
    <div className="console-command-tool">
      <div className="tool-input">
        <h4>Comando ejecutado:</h4>
        <pre className="command-text">{command}</pre>
      </div>

      {isSuccess && (
        <div className="tool-output">
          <div className="command-result">
            <span className={`exit-code ${exitCode === 0 ? "success" : "error"}`}>Código de salida: {exitCode}</span>
          </div>

          {output && (
            <div className="command-output">
              <h4>Salida:</h4>
              <pre className="output-text">{output}</pre>
            </div>
          )}

          {errorOutput && (
            <div className="command-error">
              <h4>Error:</h4>
              <pre className="error-text">{errorOutput}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
