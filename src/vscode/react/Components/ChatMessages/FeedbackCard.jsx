`src/vscode/react/Components/Feedback/FeedbackCard.jsx`

import React from 'react';
import { useApp } from '../../context/AppContext'; // Ajusta la ruta

// Iconos (puedes mejorarlos o usar SVGs)
const IconMap = {
  info: () => <span>ℹ️</span>,
  success: () => <span>✔️</span>,
  error: () => <span>❌</span>,
  thinking: () => <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚙️</span>,
  tool_executing: () => <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>🛠️</span>,
};

const FeedbackCard = ({ message }) => {
  const { theme } = useApp();
  const status = message.metadata?.status || 'info';
  const Icon = IconMap[status] || IconMap.info;

  const cardStyle = {
    padding: `${theme.spacing.small} ${theme.spacing.medium}`,
    marginBottom: theme.spacing.small,
    borderRadius: theme.borderRadius.medium,
    borderLeftWidth: '4px',
    borderLeftStyle: 'solid',
    fontSize: theme.typography.text, // Usa tu tipografía base
    lineHeight: '1.4',
    display: 'flex',
    alignItems: 'center',
    color: theme.colors.text, // Color de texto base
    backgroundColor: theme.colors.background, // Fondo base
  };

  switch (status) {
    case 'info':
      cardStyle.borderColor = theme.colors.feedbackInfoBorder;
      cardStyle.color = theme.colors.feedbackInfoText;
      // cardStyle.backgroundColor = theme.colors.feedbackInfoBackground;
      break;
    case 'success':
      cardStyle.borderColor = theme.colors.feedbackSuccessBorder;
      cardStyle.color = theme.colors.feedbackSuccessText;
      // cardStyle.backgroundColor = theme.colors.feedbackSuccessBackground;
      break;
    case 'error':
      cardStyle.borderColor = theme.colors.feedbackErrorBorder;
      cardStyle.color = theme.colors.feedbackErrorText;
      // cardStyle.backgroundColor = theme.colors.feedbackErrorBackground;
      break;
    case 'thinking':
    case 'tool_executing':
      cardStyle.borderColor = theme.colors.feedbackThinkingBorder;
      cardStyle.color = theme.colors.feedbackThinkingText;
      // cardStyle.backgroundColor = theme.colors.feedbackThinkingBackground;
      break;
  }

  const iconStyle = {
    marginRight: theme.spacing.medium,
    fontSize: '1.2em', // Hacer el ícono un poco más grande
  };

  return (
    <div style={cardStyle}>
      <span style={iconStyle}><Icon /></span>
      <span>{message.content}</span>
    </div>
  );
};

export default FeedbackCard;

