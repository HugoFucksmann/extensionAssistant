// src/vscode/react/Components/ChatMessages/new/LoadingIndicator.jsx (o la ruta correcta)
import React from "react";
import "../styles/LoadingIndicator.css"; // Ajusta la ruta si es necesario
import { useApp } from "../../../context/AppContext";

const LoadingIndicator = () => {
  const { loadingText } = useApp(); // Obtener el texto dinámico

  return (
    <div className="loading-indicator">
      <div className="loading-square"></div>
      <span className="loading-text">{loadingText}</span> {/* Usar el texto dinámico */}
    </div>
  );
};

export default LoadingIndicator;