// src/vscode/react/theme/theme.ts

export type ThemeColors = {
  primary: string
  secondary: string
  text: string
  background: string
  border: string
  chatInputBg: string
  messageUserBg: string
  messageAssistantBg: string
  error: string

  // --- NUEVOS COLORES PARA FEEDBACK ---
  feedbackInfoText: string
  feedbackSuccessText: string
  feedbackErrorText: string
  feedbackThinkingText: string

  feedbackInfoBorder: string
  feedbackSuccessBorder: string
  feedbackErrorBorder: string
  feedbackThinkingBorder: string

  feedbackInfoBackground: string
  feedbackSuccessBackground: string
  feedbackErrorBackground: string
  feedbackThinkingBackground: string

  // --- COLORES PARA STATUS INDICATORS ---
  statusInfo: string
  statusSuccess: string
  statusError: string
  statusThinking: string

  // --- COLORES PARA GLASSMORPHISM ---
  glassBackground: string
  glassBackgroundHover: string
  glassBorder: string
  glassBorderHover: string
}

export type ThemeType = {
  colors: ThemeColors
  spacing: {
    small: string
    medium: string
    large: string
    xlarge: string
  }
  borderRadius: {
    small: string
    medium: string
    large: string
    xlarge: string
  }
  typography: {
    title: string
    subtitle: string
    text: string
    small: string
    large: string
  }
  shadows: {
    small: string
    medium: string
    large: string
    glow: string
  }
  transitions: {
    fast: string
    medium: string
    slow: string
  }
}

export const getTheme = (isDarkMode = true): ThemeType => {
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

// Mock theme para desarrollo
export const mockTheme = getTheme(true)
