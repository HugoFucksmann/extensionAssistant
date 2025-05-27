// src/vscode/react/theme/theme.ts

/**
 * Gets the theme configuration
 * @param {boolean} [isDarkMode] - Dark mode flag
 * @returns {ThemeType}
 */
export const getTheme = (isDarkMode = true) => {
  const baseColors = {
    primary: isDarkMode ? "#2196F3" : "#006ab1",
    secondary: isDarkMode ? "#1A1A1A" : "#e9ebf0",
    text: isDarkMode ? "#E8E8E8" : "#333333",
    background: isDarkMode ? "#0F0F0F" : "#f5fbff",
    border: isDarkMode ? "rgba(255, 255, 255, 0.08)" : "#cccccc",
    chatInputBg: isDarkMode ? "#2a2d2e" : "#f3f3f3",
    messageUserBg: isDarkMode
      ? "linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%)"
      : "#007acc",
    messageAssistantBg: isDarkMode
      ? "linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)"
      : "#f0f0f0",
    error: isDarkMode ? "#F44336" : "#e51400",
    attachmentBackground: isDarkMode ? "#2a2d2e" : "#f3f3f3",
    attachmentHoverBackground: isDarkMode ? "#333333" : "#e9ebf0",
    attachmentBorder: isDarkMode ? "rgba(255, 255, 255, 0.08)" : "#cccccc",
    attachmentIcon: isDarkMode ? "#E8E8E8" : "#333333",
  }

  const feedbackColorsLight = {
    feedbackInfoText: "#00529B",
    feedbackSuccessText: "#1B5E20",
    feedbackErrorText: "#C62828",
    feedbackThinkingText: "#E65100",

    feedbackInfoBorder: "#2196F3",
    feedbackSuccessBorder: "#4CAF50",
    feedbackErrorBorder: "#F44336",
    feedbackThinkingBorder: "#FFB84D",

    feedbackInfoBackground: "rgba(33, 150, 243, 0.05)",
    feedbackSuccessBackground: "rgba(76, 175, 80, 0.05)",
    feedbackErrorBackground: "rgba(244, 67, 54, 0.05)",
    feedbackThinkingBackground: "rgba(255, 184, 77, 0.05)",
  }

  const feedbackColorsDark = {
    feedbackInfoText: "#E3F2FD",
    feedbackSuccessText: "#E8F5E8",
    feedbackErrorText: "#FFEBEE",
    feedbackThinkingText: "#FFF8E1",

    feedbackInfoBorder: "#2196F3",
    feedbackSuccessBorder: "#4CAF50",
    feedbackErrorBorder: "#F44336",
    feedbackThinkingBorder: "#FFB84D",

    feedbackInfoBackground: "rgba(33, 150, 243, 0.05)",
    feedbackSuccessBackground: "rgba(76, 175, 80, 0.05)",
    feedbackErrorBackground: "rgba(244, 67, 54, 0.05)",
    feedbackThinkingBackground: "rgba(255, 184, 77, 0.05)",
  }

  const statusColors = {
    statusInfo: "#2196F3",
    statusSuccess: "#4CAF50",
    statusError: "#F44336",
    statusThinking: "#FFB84D",
  }

  const glassColors = isDarkMode
    ? {
        glassBackground: "linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)",
        glassBackgroundHover: "linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)",
        glassBorder: "rgba(255, 255, 255, 0.08)",
        glassBorderHover: "rgba(255, 255, 255, 0.12)",
      }
    : {
        glassBackground: "linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%)",
        glassBackgroundHover: "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)",
        glassBorder: "rgba(255, 255, 255, 0.2)",
        glassBorderHover: "rgba(255, 255, 255, 0.3)",
      }

  return {
    colors: {
      ...baseColors,
      ...(isDarkMode ? feedbackColorsDark : feedbackColorsLight),
      ...statusColors,
      ...glassColors,
    },
    spacing: {
      small: "6px",
      medium: "12px",
      large: "20px",
      xlarge: "32px",
    },
    borderRadius: {
      small: "4px",
      medium: "8px",
      large: "12px",
      xlarge: "16px",
    },
    typography: {
      title: "24px",
      subtitle: "18px",
      text: "14px",
      small: "12px",
      large: "16px",
    },
    shadows: {
      small: "0 2px 8px rgba(0, 0, 0, 0.1)",
      medium: "0 4px 16px rgba(0, 0, 0, 0.12)",
      large: "0 8px 32px rgba(0, 0, 0, 0.15)",
      glow: "0 0 20px rgba(33, 150, 243, 0.3)",
    },
    transitions: {
      fast: "0.15s cubic-bezier(0.4, 0, 0.2, 1)",
      medium: "0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      slow: "0.5s cubic-bezier(0.4, 0, 0.2, 1)",
    },
  }
}

export const getThemeCSSVariables = (theme) => ({
  '--spacing-small': theme.spacing.small,
  '--spacing-medium': theme.spacing.medium,
  '--spacing-large': theme.spacing.large,
  '--spacing-xs': theme.spacing.xs,
  '--border-radius-small': theme.borderRadius.small,
  '--border-radius-large': theme.borderRadius.large,
  '--shadow-medium': theme.shadows.medium,
  '--text': theme.colors.text,
  '--text-muted': theme.colors.textMuted,
  '--background': theme.colors.background,
  '--border': theme.colors.border,
  '--primary': theme.colors.primary,
  
  // Variables para StatusIndicator
  '--status-size-small': '10px',
  '--status-size-medium': '14px',
  '--status-size-large': '18px',
  '--status-margin-small': theme.spacing.small,
  '--status-margin-medium': theme.spacing.medium,
  '--status-margin-large': theme.spacing.large,
  '--status-color-thinking': theme.colors.statusThinking,
  '--status-color-tool_executing': theme.colors.statusThinking,
  '--status-color-success': theme.colors.statusSuccess,
  '--status-color-error': theme.colors.statusError,
  '--status-color-info': theme.colors.statusInfo,
  '--status-border-radius': theme.borderRadius.small,
  '--status-transition': theme.transitions.medium,
  
  // Nuevas variables para mensajes
  '--glass-border': theme.colors.glassBorder,
  '--message-user-bg': theme.colors.messageUserBg,
  '--message-assistant-bg': theme.colors.messageAssistantBg,
  '--secondary': theme.colors.secondary,
  
  // Variables para bloques de código
  '--code-block-bg': theme.colors.codeBlockBg,
  '--code-block-border': theme.colors.codeBlockBorder,
  
  // Tamaños de texto
  '--text-size': theme.typography.text,
  
  // Nuevas variables para feedback
  '--hover-bg': theme.colors.hoverBackground,
  '--transition-fast': theme.transitions.fast,
  '--transition-medium': theme.transitions.medium,
  
  // Variables para archivos adjuntos
  '--attachment-bg': theme.colors.attachmentBackground,
  '--attachment-hover-bg': theme.colors.attachmentHoverBackground,
  '--attachment-border': theme.colors.attachmentBorder,
  '--attachment-icon': theme.colors.attachmentIcon
});

// Mock theme para desarrollo
export const mockTheme = getTheme(true)
