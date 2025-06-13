// ToolRendererBase.tsx

import React, { useState } from "react";
import "../styles/ToolRenderer.css";
import { ToolDefinition } from "@features/tools/types";

interface ToolChildProps {
  toolInput?: Record<string, any>;
  toolOutput?: any;
  status?: string;
  isSuccess?: boolean;
  [key: string]: any;
}

// --- CAMBIOS APLICADOS ---
interface ToolRendererBaseProps {
  // La definición ahora es opcional para manejar casos de error donde no se encuentra.
  toolDefinition?: ToolDefinition<any, any>;
  // El nombre de la herramienta es ahora requerido para usarlo como fallback.
  toolName: string;
  toolInput?: Record<string, any>;
  toolOutput?: any;
  status?: string;
  success?: boolean;
  message?: string;
  timestamp?: number;
  children?: React.ReactNode;
}

const formatTimestamp = (ts?: number): string => {
  const time = ts && !isNaN(ts) ? new Date(ts) : new Date();
  return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// --- CAMBIOS APLICADOS ---
// La función ahora es más robusta y maneja una definición opcional.
const getActionText = (
  definition: ToolDefinition<any, any> | undefined,
  toolName: string,
  toolInput: Record<string, any> | undefined,
  status: string,
  isSuccess: boolean
): string => {
  const isProcessing = status === "thinking" || status === "tool_executing";

  // Primero, intenta usar la descripción de UI si la definición existe.
  if (definition?.getUIDescription) {
    try {
      return definition.getUIDescription(toolInput);
    } catch (e) {
      // Si getUIDescription falla (ej. por un input inesperado), no crashear.
      console.error("Error in getUIDescription:", e);
    }
  }

  // Fallback si no hay definición o getUIDescription.
  const baseAction = definition?.name || toolName;
  if (isProcessing) {
    return `Ejecutando: ${baseAction}...`;
  }
  if (isSuccess) {
    return `Éxito: ${baseAction}`;
  }
  // Para errores, es útil mostrar el nombre de la herramienta que falló.
  return `Error en herramienta: ${baseAction}`;
};

export const ToolRendererBase: React.FC<ToolRendererBaseProps> = ({
  toolDefinition,
  toolName,
  toolInput = {},
  toolOutput,
  status = "thinking",
  success,
  message,
  timestamp,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSuccess = success !== undefined ? success : status === "success" || toolOutput?.success;
  const isError = status === "error" || success === false;
  const isProcessing = status === "thinking" || status === "tool_executing";
  const hasDetails = React.Children.count(children) > 0;

  // --- CAMBIOS APLICADOS ---
  // El texto de acción ahora se genera con la nueva función robusta.
  const actionText = getActionText(toolDefinition, toolName, toolInput, status, isSuccess);

  const handleToggleExpand = () => {
    if (hasDetails && !isProcessing) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      className={`tool-card ${isProcessing ? "processing" : isError ? "error" : "success"} ${isExpanded ? "expanded" : ""}`}
    >
      <div
        className={`tool-card-header ${hasDetails && !isProcessing ? "clickable" : ""}`}
        onClick={handleToggleExpand}
      >
        <div className="tool-main-info">
          <div className={`status-square ${isProcessing ? "processing" : isError ? "error" : "success"}`} />
          <span className="tool-action-text">{actionText}</span>
        </div>

        <div className="tool-controls">
          <span className="tool-timestamp">{formatTimestamp(timestamp)}</span>
          {hasDetails && !isProcessing && (
            <button
              className={`expand-button ${isExpanded ? "expanded" : ""}`}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Ocultar detalles" : "Mostrar detalles"}
            >
              <span className="expand-icon">{isExpanded ? "−" : "+"}</span>
            </button>
          )}
        </div>
      </div>

      {isExpanded && hasDetails && !isProcessing && (
        <div className="tool-card-content">
          <div className="tool-details-expanded">
            {React.Children.map(children, (child) =>
              React.isValidElement<ToolChildProps>(child)
                ? React.cloneElement(child, {
                    toolInput,
                    toolOutput,
                    status,
                    isSuccess,
                  } as ToolChildProps)
                : child
            )}
          </div>
        </div>
      )}

      {message && !hasDetails && !isProcessing && (
        <div className="tool-card-content">
          <div className="tool-message">{message}</div>
        </div>
      )}
    </div>
  );
};