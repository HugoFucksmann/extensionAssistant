import React, { useState, useEffect } from 'react';
import FeedbackCard from './FeedbackCard';
import { useApp } from '../../context/AppContext'; // Ajusta la ruta

const FeedbackAccordion = ({ operationId, initialMessages = [] }) => {
  const { theme, feedbackMessages } = useApp();
  const [isOpen, setIsOpen] = useState(true); // Por defecto abierto si es la operación activa

  const messagesForOperation = feedbackMessages[operationId] || initialMessages;
  
  // Determinar el estado general del acordeón (ej. el último estado o si hay error)
  let overallStatus = 'thinking';
  if (messagesForOperation.length > 0) {
    const lastMessage = messagesForOperation[messagesForOperation.length - 1];
    overallStatus = lastMessage.metadata?.status || 'info';
    if (messagesForOperation.some(m => m.metadata?.status === 'error')) {
      overallStatus = 'error';
    } else if (messagesForOperation.every(m => m.metadata?.status === 'success' || m.metadata?.status === 'info')) {
       // Si todos son success o info, y el último es success, entonces success.
       if (lastMessage.metadata?.status === 'success') overallStatus = 'success';
       else overallStatus = 'info'; // O el estado del último mensaje
    }
  }
  
  const isLoading = overallStatus === 'thinking' || overallStatus === 'tool_executing';

  const accordionHeaderStyle = {
    padding: `${theme.spacing.medium}`,
    cursor: 'pointer',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.medium,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary, // Un fondo ligeramente diferente para el header
    marginBottom: isOpen ? '0' : theme.spacing.medium, // Margen solo si está cerrado
    borderBottomLeftRadius: isOpen ? '0' : theme.borderRadius.medium,
    borderBottomRightRadius: isOpen ? '0' : theme.borderRadius.medium,
  };

  const accordionTitleStyle = {
    fontWeight: 'bold',
    color: theme.colors.text,
  };
  
  if (isLoading) {
    accordionTitleStyle.animation = 'pulse 1.5s infinite ease-in-out';
  }


  const contentStyle = {
    padding: theme.spacing.medium,
    border: `1px solid ${theme.colors.border}`,
    borderTop: 'none',
    borderBottomLeftRadius: theme.borderRadius.medium,
    borderBottomRightRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.medium,
    backgroundColor: theme.colors.background,
  };
  
  // CSS para la animación de pulse (puedes ponerlo en un <style> en el index.html o un archivo CSS global)
  const pulseAnimation = `@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }`;


  if (messagesForOperation.length === 0) {
    return null; // No renderizar nada si no hay mensajes para esta operación
  }

  return (
    <div>
      <style>{pulseAnimation}</style>
      <div style={accordionHeaderStyle} onClick={() => setIsOpen(!isOpen)}>
        <span style={accordionTitleStyle}>
          {isLoading ? "Procesando solicitud..." : (overallStatus === 'error' ? "Proceso fallido" : "Proceso completado")}
        </span>
        <span>{isOpen ? '➖' : '➕'}</span>
      </div>
      {isOpen && (
        <div style={contentStyle}>
          {messagesForOperation.map(msg => (
            <FeedbackCard key={msg.id} message={msg} />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackAccordion;