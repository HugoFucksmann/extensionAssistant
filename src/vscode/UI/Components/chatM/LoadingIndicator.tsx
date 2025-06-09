"use client"

import type React from "react"
import { useApp } from "../../context/AppContext" // Importamos el hook del contexto
import "./styles/LoadingIndicator.css"

// CAMBIO: Eliminamos las props de la interfaz. El componente ya no las necesita.
interface LoadingIndicatorProps {}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = () => {
  // CAMBIO: Obtenemos el estado directamente del contexto.
  const { isLoading, loadingText } = useApp()

  // CAMBIO: La lógica de visibilidad ahora es interna y depende de `isLoading`.
  if (!isLoading) {
    return null
  }

  // CAMBIO: El texto del indicador ahora viene de `loadingText` del contexto.
  return (
    <div className="loading-indicator-fixed">
      <div className="loading-indicator">
        <div className="loading-square" />
        <span className="loading-text">{loadingText}</span>
      </div>
    </div>
  )
}