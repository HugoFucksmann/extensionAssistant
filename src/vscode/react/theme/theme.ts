// src/vscode/react/theme/theme.ts

export type ThemeColors = { // Tu estructura existente
  primary: string;
  secondary: string;
  text: string;
  background: string;
  border: string;
  chatInputBg: string;
  messageUserBg: string;
  messageAssistantBg: string;
  error: string; // Ya tienes un color de error, podemos usarlo o añadir uno específico para feedback

  // --- NUEVOS COLORES PARA FEEDBACK ---
  feedbackInfoText: string;
  feedbackSuccessText: string;
  feedbackErrorText: string; // Podría ser igual a 'error' o más específico
  feedbackThinkingText: string;

  feedbackInfoBorder: string;
  feedbackSuccessBorder: string;
  feedbackErrorBorder: string;
  feedbackThinkingBorder: string;

  feedbackInfoBackground: string;
  feedbackSuccessBackground: string;
  feedbackErrorBackground: string;
  feedbackThinkingBackground: string;
};

export type ThemeType = {
  colors: ThemeColors;
  spacing: {
    small: string;
    medium: string;
    large: string;
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
  };
  typography: {
    title: string;
    subtitle: string;
    text: string;
  };
};

export const getTheme = (isDarkMode: boolean): ThemeType => {
  const baseColors = { // Colores base que ya tenías
    primary: isDarkMode ? '#007acc' : '#006ab1',
    secondary: isDarkMode ? '#252526' : '#e9ebf0',
    text: isDarkMode ? '#e0e0e0' : '#333333',
    background: isDarkMode ? '#1e1e1e' : '#f5fbff',
    border: isDarkMode ? '#454545' : '#cccccc',
    chatInputBg: isDarkMode ? '#2a2d2e' : '#f3f3f3',
    messageUserBg: isDarkMode ? '#0e639c' : '#007acc', // Para usuario, el texto debería ser claro
    messageAssistantBg: isDarkMode ? '#2d2d2d' : '#f0f0f0',
    error: isDarkMode ? '#f14c4c' : '#e51400',
  };

  const feedbackColorsLight = {
    feedbackInfoText: '#00529B',
    feedbackSuccessText: '#1B5E20',
    feedbackErrorText: baseColors.error, // Reutilizar tu color de error existente para tema claro
    feedbackThinkingText: '#E65100',

    feedbackInfoBorder: '#60A5FA',
    feedbackSuccessBorder: '#4ADE80',
    feedbackErrorBorder: '#F87171', // Un borde rojo más claro para el feedback de error
    feedbackThinkingBorder: '#FBBF24',

    feedbackInfoBackground: '#EFF6FF',
    feedbackSuccessBackground: '#F0FDF4',
    feedbackErrorBackground: '#FEF2F2',
    feedbackThinkingBackground: '#FFFBEB',
  };

  const feedbackColorsDark = {
    feedbackInfoText: '#90CAF9',
    feedbackSuccessText: '#A5D6A7',
    feedbackErrorText: baseColors.error, // Reutilizar tu color de error existente para tema oscuro
    feedbackThinkingText: '#FFCC80',

    feedbackInfoBorder: '#2563EB',
    feedbackSuccessBorder: '#16A34A',
    feedbackErrorBorder: '#DC2626', // Un borde rojo más específico para el feedback de error
    feedbackThinkingBorder: '#D97706',

    feedbackInfoBackground: '#1E293B',
    feedbackSuccessBackground: '#1A2E2A',
    feedbackErrorBackground: '#2E1A1A',
    feedbackThinkingBackground: '#2E261A',
  };

  return {
    colors: {
      ...baseColors,
      ...(isDarkMode ? feedbackColorsDark : feedbackColorsLight),
    },
    spacing: {
      small: '4px',
      medium: '8px',
      large: '16px'
    },
    borderRadius: {
      small: '4px',
      medium: '8px',
      large: '12px'
    },
    typography: {
      title: '1.5em',
      subtitle: '1.2em',
      text: '1em'
    }
  };
};