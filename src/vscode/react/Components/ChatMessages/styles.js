// ui/Components/ChatMessages/styles.js

export const styles = {
  // Contenedores principales
  container: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflow: "hidden",
    height: "100%",
  },

  scrollableContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    flex: 1,
    overflow: "auto",
    paddingRight: "5px",
  },

  chatContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "10px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },

  emptyContainer: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },

  // Mensajes base
  message: {
    marginBottom: "10px",
    padding: "8px",
    borderRadius: "4px",
    maxWidth: "100%",
    wordWrap: "break-word",
  },

  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "var(--vscode-editor-background)",
    color: "var(--vscode-button-foreground)",
    border: "1px solid var(--vscode-input-border)",
  },

  aiMessage: {
    alignSelf: "flex-start",
  },

  agentMessage: {
    backgroundColor: "var(--vscode-editor-background)",
    borderLeft: "4px solid var(--vscode-activityBarBadge-background)",
    padding: "10px",
    margin: "10px 0",
    borderRadius: "4px",
    alignSelf: "flex-start",
  },

  agentMessageContent: {
    color: "var(--vscode-foreground)",
    fontSize: "14px",
  },

  // Mensajes de feedback del sistema
  feedbackMessage: {
    padding: "8px 12px",
    margin: "6px 20px",
    borderRadius: "4px",
    fontSize: "13px",
    lineHeight: "1.4",
    borderLeftWidth: "4px",
    borderLeftStyle: "solid",
    alignSelf: "stretch",
    maxWidth: "calc(100% - 40px)",
    opacity: 0.95,
  },

  feedbackIcon: {
    marginRight: "8px",
    verticalAlign: "middle",
  },

  // Información de herramientas ejecutadas
  toolsInfoContainer: {
    marginTop: "12px",
    padding: "8px",
    backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)",
    borderRadius: "4px",
    border: "1px solid var(--vscode-panel-border)",
  },

  toolsInfoHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    padding: "4px 0",
  },

  toolsInfoTitle: {
    fontSize: "12px",
    fontWeight: "500",
    color: "var(--vscode-descriptionForeground)",
  },

  toolsInfoToggle: {
    fontSize: "11px",
    color: "var(--vscode-button-foreground)",
  },

  toolsInfoContent: {
    marginTop: "8px",
    padding: "8px",
    backgroundColor: "var(--vscode-editor-background)",
    borderRadius: "4px",
    border: "1px solid var(--vscode-panel-border)",
  },

  // Contenedores virtuales
  virtualListContainer: {
    height: "100%",
    width: "100%",
    flex: 1,
    overflow: "auto",
  },

  // Bloques de código
  codeBlockContainer: {
    margin: "1em 0",
    borderRadius: "4px",
    overflow: "hidden",
    backgroundColor: "var(--vscode-input-background)",
    border: "1px solid var(--vscode-input-border)",
  },

  codeBlockHeader: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: "8px 16px",
    borderBottom: "1px solid var(--vscode-input-border)",
  },

  filename: {
    fontFamily: "Consolas, Monaco, monospace",
    marginRight: "auto",
    color: "var(--vscode-foreground)",
  },

  buttonContainer: {
    display: "flex",
    gap: "8px",
  },

  button: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--vscode-foreground)",
    borderRadius: "4px",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "var(--vscode-toolbar-hoverBackground)",
    },
  },

  pre: {
    margin: 0,
    padding: "1em",
    overflow: "auto",
    fontSize: "14px",
    lineHeight: "1.5",
    color: "var(--vscode-foreground)",
    "&::WebkitScrollbar": {
      width: "8px",
      height: "8px",
    },
    "&::WebkitScrollbarTrack": {
      background: "transparent",
    },
    "&::WebkitScrollbarThumb": {
      background: "var(--vscode-scrollbarSlider-background)",
      borderRadius: "4px",
      "&:hover": {
        background: "var(--vscode-scrollbarSlider-hoverBackground)",
      },
    },
  },

  // Archivos adjuntos
  attachedFiles: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
    marginBottom: "8px",
  },

  fileTag: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "var(--vscode-button-secondaryBackground)",
    color: "var(--vscode-button-secondaryForeground)",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "12px",
  },

  copyButton: {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--vscode-button-foreground)",
    cursor: "pointer",
    padding: "2px 6px",
    fontSize: "12px",
    borderRadius: "2px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    transition: "opacity 0.2s",
    "&:hover": {
      opacity: 0.8,
    },
  },

  // Headers y edición de mensajes
  userMessageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "4px",
  },

  editButton: {
    backgroundColor: "transparent",
    border: "none",
    padding: "2px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    opacity: 0.7,
    color: "var(--vscode-button-foreground)",
    "&:hover": {
      opacity: 1,
    },
  },

  editInput: {
    minHeight: "60px",
    width: "100%",
    backgroundColor: "var(--vscode-input-background)",
    color: "var(--vscode-input-foreground)",
    border: "1px solid var(--vscode-input-border)",
    borderRadius: "4px",
    padding: "8px",
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: "inherit",
  },

  // Contenido markdown
  markdownContent: {
    padding: "8px",
    lineHeight: "1.5",
    "& h1, & h2, & h3, & h4, & h5, & h6": {
      marginTop: "16px",
      marginBottom: "8px",
      fontWeight: "bold",
    },
    "& p": {
      marginBottom: "8px",
    },
    "& ul, & ol": {
      paddingLeft: "20px",
      marginBottom: "8px",
    },
    "& strong": {
      fontWeight: "bold",
    },
    "& em": {
      fontStyle: "italic",
    },
  },

  // === NUEVOS ESTILOS PARA EL SISTEMA MEJORADO ===

  // Animaciones CSS-in-JS
  animations: {
    glowPulse: {
      "0%, 100%": {
        opacity: 1,
        transform: "scale(1)",
      },
      "50%": {
        opacity: 0.7,
        transform: "scale(1.05)",
      },
    },
    successGlow: {
      "0%": {
        opacity: 1,
        transform: "scale(1)",
      },
      "50%": {
        opacity: 0.8,
        transform: "scale(1.1)",
      },
      "100%": {
        opacity: 1,
        transform: "scale(1)",
      },
    },
    errorPulse: {
      "0%, 100%": {
        opacity: 1,
        transform: "scale(1)",
      },
      "25%, 75%": {
        opacity: 0.8,
        transform: "scale(1.05)",
      },
    },
    slideDown: {
      from: {
        opacity: 0,
        transform: "translateY(-10px)",
        maxHeight: 0,
      },
      to: {
        opacity: 1,
        transform: "translateY(0)",
        maxHeight: "500px",
      },
    },
    fadeIn: {
      from: {
        opacity: 0,
        transform: "translateY(10px)",
      },
      to: {
        opacity: 1,
        transform: "translateY(0)",
      },
    },
  },

  // Status Indicators
  statusIndicator: {
    display: "inline-block",
    borderRadius: "4px",
    border: "1px solid transparent",
    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
    flexShrink: 0,
  },

  statusIndicatorSmall: {
    width: "10px",
    height: "10px",
    marginRight: "8px",
  },

  statusIndicatorMedium: {
    width: "14px",
    height: "14px",
    marginRight: "12px",
  },

  statusIndicatorLarge: {
    width: "18px",
    height: "18px",
    marginRight: "16px",
  },

  statusIndicatorInfo: {
    backgroundColor: "#2196F3",
    borderColor: "#1976D2",
    boxShadow:
      "0 0 6px rgba(33, 150, 243, 0.25), 0 0 12px rgba(33, 150, 243, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
  },

  statusIndicatorSuccess: {
    backgroundColor: "#4CAF50",
    borderColor: "#45A049",
    boxShadow:
      "0 0 8px rgba(76, 175, 80, 0.3), 0 0 16px rgba(76, 175, 80, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
    animation: "successGlow 0.6s ease-out",
  },

  statusIndicatorError: {
    backgroundColor: "#F44336",
    borderColor: "#E53935",
    boxShadow:
      "0 0 8px rgba(244, 67, 54, 0.3), 0 0 16px rgba(244, 67, 54, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
    animation: "errorPulse 0.8s ease-out",
  },

  statusIndicatorThinking: {
    backgroundColor: "#FFB84D",
    borderColor: "#FF9500",
    boxShadow:
      "0 0 10px rgba(255, 184, 77, 0.4), 0 0 20px rgba(255, 184, 77, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
    animation: "glowPulse 2s ease-in-out infinite",
  },

  // Sistema de mensajes
  systemMessageContainer: {
    marginBottom: "16px",
    alignSelf: "stretch",
    maxWidth: "100%",
  },

  systemMessageHeader: {
    padding: "16px 20px",
    cursor: "pointer",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)",
    backdropFilter: "blur(10px)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    "&:hover": {
      background: "linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)",
      borderColor: "rgba(255, 255, 255, 0.12)",
      transform: "translateY(-1px)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
    },
  },

  systemMessageHeaderOpen: {
    borderBottomLeftRadius: "0",
    borderBottomRightRadius: "0",
    marginBottom: "0",
  },

  systemMessageTitleContainer: {
    display: "flex",
    alignItems: "center",
    fontWeight: "600",
    color: "#E8E8E8",
    fontSize: "14px",
    letterSpacing: "0.01em",
  },

  systemMessageToggleIcon: {
    fontSize: "12px",
    color: "rgba(255, 255, 255, 0.6)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    borderRadius: "6px",
    background: "rgba(255, 255, 255, 0.05)",
    "&:hover": {
      background: "rgba(255, 255, 255, 0.08)",
      color: "rgba(255, 255, 255, 0.8)",
    },
  },

  systemMessageToggleIconOpen: {
    transform: "rotate(180deg)",
  },

  systemMessageContent: {
    padding: "20px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderTop: "none",
    borderBottomLeftRadius: "12px",
    borderBottomRightRadius: "12px",
    marginBottom: "16px",
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.01) 0%, rgba(255, 255, 255, 0.005) 100%)",
    backdropFilter: "blur(10px)",
    animation: "slideDown 0.3s ease-out",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },

  // Feedback Cards
  feedbackCard: {
    padding: "12px 16px",
    marginBottom: "8px",
    borderRadius: "8px",
    borderLeft: "3px solid transparent",
    fontSize: "13px",
    lineHeight: "1.5",
    display: "flex",
    alignItems: "flex-start",
    color: "rgba(255, 255, 255, 0.85)",
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)",
    backdropFilter: "blur(10px)",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    position: "relative",
    overflow: "hidden",
    "&:hover": {
      background: "linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)",
      borderColor: "rgba(255, 255, 255, 0.08)",
      transform: "translateX(4px)",
    },
  },

  feedbackCardContent: {
    flex: 1,
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },

  feedbackCardText: {
    flex: 1,
    margin: 0,
    fontWeight: "400",
    letterSpacing: "0.01em",
  },

  feedbackCardInfo: {
    borderLeftColor: "#2196F3",
  },

  feedbackCardSuccess: {
    borderLeftColor: "#4CAF50",
  },

  feedbackCardError: {
    borderLeftColor: "#F44336",
  },

  feedbackCardThinking: {
    borderLeftColor: "#FFB84D",
  },

  // Mensajes regulares mejorados
  messageContainer: {
    marginBottom: "20px",
    padding: "16px 20px",
    borderRadius: "12px",
    maxWidth: "85%",
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)",
    color: "#E8E8E8",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    backdropFilter: "blur(10px)",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    animation: "fadeIn 0.4s ease-out",
  },

  messageContainerUser: {
    alignSelf: "flex-end",
    background: "linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%)",
  },

  messageContainerAssistant: {
    alignSelf: "flex-start",
  },

  messageHeader: {
    fontWeight: "600",
    marginBottom: "8px",
    fontSize: "13px",
    letterSpacing: "0.01em",
  },

  messageContent: {
    fontSize: "14px",
    lineHeight: "1.6",
    letterSpacing: "0.01em",
  },

  messageTimestamp: {
    fontSize: "11px",
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: "8px",
  },

  // Archivos adjuntos mejorados
  attachedFilesImproved: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "12px",
  },

  fileTagImproved: {
    fontSize: "12px",
    color: "#64B5F6",
    padding: "4px 8px",
    background: "rgba(33, 150, 243, 0.1)",
    borderRadius: "6px",
    display: "inline-block",
    marginRight: "8px",
    marginBottom: "4px",
  },

  // Botones y controles
  demoButton: {
    background: "linear-gradient(135deg, #2196F3 0%, #1976D2 100%)",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: "0 4px 16px rgba(33, 150, 243, 0.3)",
    },
  },

  demoButtonContainer: {
    padding: "16px",
    textAlign: "center",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    marginBottom: "16px",
  },

  // Layout principal
  appContainer: {
    height: "100vh",
    background: "linear-gradient(135deg, #0F0F0F 0%, #1A1A1A 100%)",
    color: "#E8E8E8",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif",
    overflow: "hidden",
  },

  mainContainer: {
    maxWidth: "900px",
    margin: "0 auto",
    height: "100%",
    padding: "32px",
    display: "flex",
    flexDirection: "column",
  },

  header: {
    textAlign: "center",
    marginBottom: "32px",
    paddingBottom: "20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: "24px",
    fontWeight: "600",
    margin: "0",
    letterSpacing: "-0.02em",
    background: "linear-gradient(135deg, #FFFFFF 0%, #E8E8E8 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },

  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: "14px",
    margin: "8px 0 0 0",
    fontWeight: "400",
  },

  chatContainer: {
    flex: 1,
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)",
    borderRadius: "16px",
    padding: "32px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    backdropFilter: "blur(20px)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
    overflow: "hidden",
  },

  emptyState: {
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: "14px",
    fontStyle: "italic",
  },

  // Scrollbar personalizado
  customScrollbar: {
    "&::-webkit-scrollbar": {
      width: "6px",
      height: "6px",
    },
    "&::-webkit-scrollbar-track": {
      background: "transparent",
    },
    "&::-webkit-scrollbar-thumb": {
      background: "rgba(255, 255, 255, 0.2)",
      borderRadius: "3px",
    },
    "&::-webkit-scrollbar-thumb:hover": {
      background: "rgba(255, 255, 255, 0.3)",
    },
  },
}

// Función para aplicar animaciones CSS-in-JS
export const applyAnimation = (element, animationName, duration = "0.3s", easing = "ease-out") => {
  if (!element || !styles.animations[animationName]) return

  const keyframes = styles.animations[animationName]
  const animation = element.animate(
    Object.entries(keyframes).map(([key, value]) => value),
    {
      duration: Number.parseFloat(duration) * 1000,
      easing: easing,
      fill: "forwards",
    },
  )

  return animation
}

// Función helper para combinar estilos
export const combineStyles = (...styleObjects) => {
  return Object.assign({}, ...styleObjects)
}

// Función para aplicar hover effects
export const applyHoverEffect = (baseStyle, hoverStyle) => {
  return {
    ...baseStyle,
    "&:hover": {
      ...baseStyle["&:hover"],
      ...hoverStyle,
    },
  }
}
