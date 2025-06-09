import type React from "react"
import "./styles/StatusIndicator.css"

interface StatusIndicatorProps {
  isVisible: boolean
  loadingText: string
  size?: "small" | "medium" | "large"
}

const stateTexts = {
  'analysis': 'Analizando...',
  'initialAnalysis': 'Analizando...',
  'ANALYSIS': 'Analizando...',
  'reasoning': 'Razonando...',
  'executing': 'Ejecutando...',
  'EXECUTION': 'Ejecutando...',
  'tool_executing': 'Ejecutando...',
  'finalResponse': 'Generando respuesta...',
  'finalResponseGeneration': 'Generando respuesta...',
  'RESPONSE': 'Generando respuesta...'
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  isVisible,
  loadingText,
  size = "medium"
}) => {
  if (!isVisible) {
    return null;
  }

  const displayText = stateTexts[loadingText as keyof typeof stateTexts] || "thinking...";

  return (
    <div className={`status-indicator ${size}`}>
      <div className="status-content">
        <div className="status-dot processing" />
        <span className="status-text">{displayText}</span>
      </div>
    </div>
  );
};