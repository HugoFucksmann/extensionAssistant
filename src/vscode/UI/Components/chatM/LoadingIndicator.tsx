"use client"

import type React from "react"
import "./styles/LoadingIndicator.css"

interface LoadingIndicatorProps {
  phase?: string
  isVisible?: boolean
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ phase, isVisible = false }) => {
  if (!isVisible) return null

  const getLoadingText = () => {
    if (phase) {
      return `Ejecutando: ${phase}`
    }
    return "Thinking..."
  }

  return (
    <div className="loading-indicator-fixed">
      <div className="loading-indicator">
        <div className="loading-square" />
        <span className="loading-text">{getLoadingText()}</span>
      </div>
    </div>
  )
}
