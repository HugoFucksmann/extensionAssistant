// src/vscode/react/Components/ChatMessages/FinalResponse.jsx (Implementación)
import React, { memo } from "react";
// import { useApp } from "../../context/AppContext"; // Para theme o postMessage si las acciones se manejan aquí
import MarkdownContent from '../MessageContent/MarkdownContent'; // Tu componente existente
import "../MessageRenderer.css"; // Reutiliza estilos de mensajes de asistente

const FinalResponse = memo(({ response }) => {
  // const { theme, postMessage } = useApp(); // Descomentar si es necesario

  if (!response || response.sender !== "assistant") {
    // console.warn("FinalResponse received non-assistant or null message:", response);
    return null; // No renderizar si no es una respuesta de asistente válida
  }

  const formattedMessage = {
    ...response,
    content: response.content || response.text || "",
    timestamp: response.timestamp || Date.now(),
    id: response.id || `asst_resp_${Date.now()}`, // Asegurar un ID único
  };

  // const handleActionClick = (actionType, messageId) => {
  //   console.log(`Action clicked: ${actionType} for message ${messageId}`);
  //   // Ejemplo: postMessage('uiAction', { type: actionType, messageId });
  // };

  return (
    // Utiliza tus clases CSS existentes para mensajes de asistente
    // Puedes añadir una clase específica para FinalResponse si necesitas estilos adicionales
    <div className="message-container message-container-assistant message-fade-in" style={{ marginTop: 'var(--spacing-medium)' /* O según tu diseño */ }}>
      <div className="message-header assistant">
        Assistant
      </div>

      <MarkdownContent content={formattedMessage.content} />

      {/* Archivos adjuntos si la respuesta final puede tenerlos */}
      {/* {formattedMessage.files?.length > 0 && (
        <div className="attached-files-container" style={{ marginTop: 'var(--spacing-small)'}}>
          {formattedMessage.files.map((file, i) => (
            <div key={`${formattedMessage.id}-file-${i}`} className="attached-file">
              <span className="attached-file-icon">📎</span>
              {typeof file === 'string' ? file : (file.name || file.path)}
            </div>
          ))}
        </div>
      )} */}

      <div className="message-timestamp assistant">
        {new Date(formattedMessage.timestamp).toLocaleTimeString()}
      </div>

      {/* Placeholder para botones de acción */}
      {/* <div style={{ marginTop: 'var(--spacing-medium)', display: 'flex', gap: 'var(--spacing-small)' }}>
        <button onClick={() => handleActionClick('view_charts', formattedMessage.id)}>📊 View Charts</button>
        <button onClick={() => handleActionClick('download_report', formattedMessage.id)}>📄 Download Report</button>
      </div> */}
    </div>
  );
});

FinalResponse.displayName = "FinalResponse";
export default FinalResponse;