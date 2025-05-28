// src/vscode/react/Components/ChatMessages/ProcessingFlow.jsx (Implementación Parcial)
import React, { useState, memo, useMemo } from "react";
import { useApp } from '../../../context/AppContext';
import ProcessingStep from "./ProcessingStep";
import FinalResponse from "./FinalResponse";
import StatusIndicator from '../StatusIndicator'; // Tu StatusIndicator
import '../FeedbackRenderer.css'; // Para estilos de cabecera y contenedor
// Podrías necesitar un CSS específico para la línea de tiempo si no está en FeedbackRenderer.css
// import "./ProcessingFlow.css";

const ProcessingFlow = memo(({ operationMessages = [], finalResponse, operationId }) => {
  const { theme, activeFeedbackOperationId } = useApp();
  // Por defecto, los flujos pasados no están colapsados, el activo podría estarlo o no.
  // Podrías querer que los flujos que NO son el activeFeedbackOperationId empiecen colapsados.
  const isActiveFlow = operationId === activeFeedbackOperationId;
  const [isCollapsed, setIsCollapsed] = useState(!isActiveFlow && operationMessages.length > 3); // Colapsar si no es activo y tiene muchos pasos

  const flowStatusInfo = useMemo(() => {
    if (finalResponse) {
      return { title: "Analysis Complete", status: "success", isLoading: false };
    }

    const activeExecutingStep = operationMessages.find(
      (msg) => msg.metadata?.status === "tool_executing" || msg.metadata?.status === "thinking"
    );

    if (activeExecutingStep) {
      return {
        title: activeExecutingStep.metadata?.toolName || "Processing...",
        status: activeExecutingStep.metadata?.status,
        isLoading: true,
      };
    }

    if (operationMessages.length > 0) {
      const lastStep = operationMessages[operationMessages.length - 1];
      // Si el último paso fue un éxito o error, pero no hay respuesta final, indica que está esperando o completó una fase
      if (lastStep.metadata?.status === "success" || lastStep.metadata?.status === "error") {
        return { title: "Step Completed", status: lastStep.metadata.status, isLoading: false };
      }
      return { title: "Processing...", status: "thinking", isLoading: true }; // Estado intermedio
    }

    return { title: "Initializing...", status: "thinking", isLoading: true }; // Si no hay mensajes de operación aún
  }, [operationMessages, finalResponse, operationId]);

  const completedStepsCount = useMemo(() => {
    return operationMessages.filter(
      (msg) => msg.metadata?.status === "success" || msg.metadata?.status === "error" || (msg.sender === 'assistant' && msg.metadata?.status !== 'tool_executing')
    ).length;
  }, [operationMessages]);
  const totalStepsCount = operationMessages.length;

  const containerStyle = { // Estilos que ya deberías tener en .feedback-container
    // backgroundColor: theme.colors.glassBackground,
    // border: `1px solid ${theme.colors.glassBorder}`,
    // boxShadow: 'var(--shadow-medium)', // de tu theme.js o CSS
    // borderRadius: 'var(--border-radius-large)', // de tu theme.js o CSS
    margin: 'var(--spacing-medium) var(--spacing-large)', // Ajusta según tu diseño
  };

  const contentStyle = { // Estilos que ya deberías tener en .feedback-content
    maxHeight: isCollapsed ? "0" : "500px", // Ajusta la altura máxima
    overflow: 'hidden',
    transition: 'max-height var(--transition-medium) ease-in-out', // ease-in-out para suavidad
    // padding: 'var(--spacing-small)', // Padding interno para el contenido si es necesario
  };

  // Estilo para la línea de tiempo (si decides implementarla visualmente)
  const timelineContainerStyle = {
    position: 'relative',
    padding: 'var(--spacing-small) 0 var(--spacing-small) var(--spacing-large)', // Espacio para la línea
    // Si no hay línea visual, el padding izquierdo puede ser menor o igual al de los items
  };
  // const timelineLineStyle = { ... }; // Si añades una línea visual

  return (
    <div className="feedback-container message-fade-in" style={containerStyle}>
      <div className="feedback-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="feedback-header-content">
          <StatusIndicator status={flowStatusInfo.status} size="medium" />
          <span className="feedback-title">{flowStatusInfo.title}</span>
          {flowStatusInfo.isLoading && ( // Indicador de carga sutil (puntos suspensivos)
            <span style={{ marginLeft: '4px', animation: 'ellipsis 1.5s infinite' }}>...</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {totalStepsCount > 0 && (
            <span style={{ fontSize: 'var(--typography-small)', color: theme.colors.textMuted, marginRight: 'var(--spacing-medium)' }}>
              {completedStepsCount}/{totalStepsCount} steps
            </span>
          )}
          <button
            className="feedback-collapse-button"
            aria-expanded={!isCollapsed}
            aria-controls={`flow-content-${operationId || 'no-op'}`}
            onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
          >
            {isCollapsed ? "▼" : "▲"}
          </button>
        </div>
      </div>

      <div
        id={`flow-content-${operationId || 'no-op'}`}
        className="feedback-content" // Reutiliza esta clase si define padding, etc.
        style={contentStyle}
      >
        {/* feedback-scrollable puede ser necesario si el contenido excede maxHeight y quieres scroll DENTRO de la sección colapsable */}
        <div className="feedback-scrollable" style={timelineContainerStyle}>
          {operationMessages.map((message, index) => (
            <ProcessingStep
              key={message.id || `step-${index}-${message.timestamp}`}
              message={message}
              // Puedes pasar isFirst/isLast si necesitas estilos especiales para los nodos de la línea de tiempo
              // isFirst={index === 0}
              // isLast={index === operationMessages.length - 1 && !finalResponse}
            />
          ))}
        </div>
      </div>

      {/* Separador y Respuesta Final */}
      {finalResponse && (
        <>
          {operationMessages.length > 0 && !isCollapsed && ( // Mostrar separador solo si hay pasos y no está colapsado
             <div style={{
               height: "1px",
               background: `linear-gradient(to right, transparent, ${theme.colors.border}, transparent)`,
               margin: 'var(--spacing-medium) 0 var(--spacing-small) 0' // Ajusta márgenes
              }} />
          )}
          {/* La respuesta final se muestra fuera del div colapsable de los pasos, o dentro si se prefiere */}
          {/* Si está fuera, no se colapsa. Si está dentro de contentStyle, sí. */}
          {/* Por ahora, la mantendremos visible incluso si los pasos están colapsados, pero debajo de ellos. */}
          <div style={{padding: '0 var(--spacing-small) var(--spacing-small) var(--spacing-small)'}}> {/* Padding para que no pegue a los bordes */}
            <FinalResponse response={finalResponse} />
          </div>
        </>
      )}
    </div>
  );
});
ProcessingFlow.displayName = "ProcessingFlow";
export default ProcessingFlow;