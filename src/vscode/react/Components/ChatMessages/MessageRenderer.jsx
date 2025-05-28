// src/vscode/react/Components/ChatMessages/MessageRenderer.jsx (Adaptado)
import React, { memo } from "react";
// import { useApp } from "../../context/AppContext"; // Solo si necesitas theme para algo muy específico aquí
import MarkdownContent from './MessageContent/MarkdownContent'; // Tu componente existente
import "./MessageRenderer.css"; // Tu CSS existente

const MessageRenderer = memo(({ message }) => {
  // const { theme } = useApp(); // Descomentar si es estrictamente necesario

  // Este componente ahora solo debería recibir mensajes de usuario.
  // Si llega otro tipo, es un error en la lógica de ConversationGroup.
  if (!message || message.sender !== "user") {
    // console.warn("User MessageRenderer received non-user or null message:", message);
    return null; // No renderizar nada si no es un mensaje de usuario válido
  }

  const formattedMessage = {
    ...message,
    content: message.content || message.text || "",
    timestamp: message.timestamp || Date.now(),
    id: message.id || `user_msg_${Date.now()}`, // Asegurar un ID único
    files: message.files || [],
  };

  return (
    // Utiliza tus clases CSS existentes para mensajes de usuario
    <div className="message-container message-container-user message-fade-in">
      <div className="message-header user">
        You
      </div>

      <MarkdownContent content={formattedMessage.content} />

      {formattedMessage.files.length > 0 && (
        // Revisa si tienes estilos específicos para el contenedor de archivos en MessageRenderer.css
        // o usa los de Attachments.css si son más genéricos
        <div className="attached-files-container" style={{ marginTop: 'var(--spacing-small)'}}>
          {formattedMessage.files.map((file, i) => (
            <div key={`${formattedMessage.id}-file-${i}`} className="attached-file">
              <span className="attached-file-icon">📎</span>
              {/* Asume que 'file' es un string o un objeto con 'path' o 'name' */}
              {typeof file === 'string' ? file : (file.name || file.path)}
            </div>
          ))}
        </div>
      )}

      <div className="message-timestamp user">
        {new Date(formattedMessage.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
});

MessageRenderer.displayName = "MessageRenderer";
export default MessageRenderer;