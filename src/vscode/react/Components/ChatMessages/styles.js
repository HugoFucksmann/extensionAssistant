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
    // paddingRight is removed as ChatMessages.jsx applies padding with theme.spacing
  },

  emptyContainer: { // Used by EmptyChatView
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },

  // Mensajes base (structural)
  message: { // Generic base, if needed
    marginBottom: "10px", // Example: theme.spacing.medium
    padding: "8px",      // Example: theme.spacing.small
    borderRadius: "4px", // Example: theme.borderRadius.small
    maxWidth: "100%",
    wordWrap: "break-word",
  },

  userMessage: { // Primarily for alignment
    alignSelf: "flex-end",
    // backgroundColor, color, border will be applied from theme in UserMessage.jsx or Message component
  },

  aiMessage: { // Primarily for alignment
    alignSelf: "flex-start",
    // backgroundColor, color, border will be applied from theme in Message component
  },

  // Información de herramientas ejecutadas (Kept cautiously, assuming still in use for specific message types)
  toolsInfoContainer: {
    marginTop: "12px", // theme.spacing.medium
    padding: "8px",    // theme.spacing.small
    // backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)", // Theme variable
    borderRadius: "4px", // theme.borderRadius.small
    // border: "1px solid var(--vscode-panel-border)", // Theme variable
  },

  toolsInfoHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    padding: "4px 0",
  },

  toolsInfoTitle: {
    fontSize: "12px", // theme.typography.small
    fontWeight: "500",
    // color: "var(--vscode-descriptionForeground)", // Theme variable
  },

  toolsInfoToggle: {
    fontSize: "11px",
    // color: "var(--vscode-button-foreground)", // Theme variable
  },

  toolsInfoContent: {
    marginTop: "8px",
    padding: "8px",
    // backgroundColor: "var(--vscode-editor-background)", // Theme variable
    borderRadius: "4px",
    // border: "1px solid var(--vscode-panel-border)", // Theme variable
  },

  // Bloques de código
  codeBlockContainer: {
    margin: "1em 0", // Could be theme.spacing.medium or large
    borderRadius: "4px", // theme.borderRadius.small
    overflow: "hidden",
    // backgroundColor: "var(--vscode-input-background)", // Theme variable
    // border: "1px solid var(--vscode-input-border)", // Theme variable
  },

  codeBlockHeader: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: "8px 16px", // theme.spacing.small theme.spacing.medium
    // borderBottom: "1px solid var(--vscode-input-border)", // Theme variable
  },

  filename: {
    fontFamily: "Consolas, Monaco, monospace", // Specific font stack for code
    marginRight: "auto",
    // color: "var(--vscode-foreground)", // Theme variable
  },

  buttonContainer: {
    display: "flex",
    gap: "8px", // theme.spacing.small
  },

  button: { // Generic button style for code block
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // color: "var(--vscode-foreground)", // Theme variable
    borderRadius: "4px",
    transition: "all 0.2s ease", // theme.transitions.fast
    "&:hover": {
      // backgroundColor: "var(--vscode-toolbar-hoverBackground)", // Theme variable
    },
  },

  pre: { // For <pre> tag in CodeBlock
    margin: 0,
    padding: "1em", // Consistent padding for code
    overflow: "auto",
    fontSize: "14px", // theme.typography.text
    lineHeight: "1.5",
    // color: "var(--vscode-foreground)", // Theme variable
    // Scrollbar styles within <pre> can be kept if specific, or use customScrollbar globally
    "&::WebkitScrollbar": {
      width: "8px",
      height: "8px",
    },
    "&::WebkitScrollbarTrack": {
      background: "transparent",
    },
    "&::WebkitScrollbarThumb": {
      // background: "var(--vscode-scrollbarSlider-background)", // Theme variable
      borderRadius: "4px",
      "&:hover": {
        // background: "var(--vscode-scrollbarSlider-hoverBackground)", // Theme variable
      },
    },
  },

  // Archivos adjuntos (UserMessage.jsx uses its own styles with theme)
  attachedFiles: { // Generic structure if needed elsewhere
    display: "flex",
    gap: "4px", // theme.spacing.xs or small
    flexWrap: "wrap",
    marginBottom: "8px", // theme.spacing.small
  },

  fileTag: { // Generic structure
    display: "flex",
    alignItems: "center",
    // backgroundColor: "var(--vscode-button-secondaryBackground)", // Theme variable
    // color: "var(--vscode-button-secondaryForeground)", // Theme variable
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "12px", // theme.typography.small
  },

  // For UserMessage.jsx editing functionality
  userMessageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "4px", // theme.spacing.xs or small
  },

  editButton: { // Structure for edit button in UserMessage
    background: "transparent",
    border: "none",
    padding: "2px", // theme.spacing.xs
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    opacity: 0.7,
    // color: "var(--vscode-button-foreground)", // Theme variable
    "&:hover": {
      opacity: 1,
    },
  },

  editInput: { // Structure for edit textarea in UserMessage
    minHeight: "60px", // Or derive from theme if applicable
    width: "100%",
    // backgroundColor: "var(--vscode-input-background)", // Theme variable
    // color: "var(--vscode-input-foreground)", // Theme variable
    // border: "1px solid var(--vscode-input-border)", // Theme variable
    borderRadius: "4px", // theme.borderRadius.small
    padding: "8px", // theme.spacing.small
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: "inherit",
  },

  // Contenido markdown
  markdownContent: { // Base styling for markdown rendered content
    // padding: "8px", // Component using it might apply its own padding from theme
    lineHeight: "1.6", // Good default
    "& h1, & h2, & h3, & h4, & h5, & h6": {
      marginTop: "16px", // theme.spacing.medium
      marginBottom: "8px", // theme.spacing.small
      fontWeight: "bold",
    },
    "& p": {
      marginBottom: "8px", // theme.spacing.small
    },
    "& ul, & ol": {
      paddingLeft: "20px", // theme.spacing.large
      marginBottom: "8px", // theme.spacing.small
    },
    "& strong": {
      fontWeight: "bold",
    },
    "& em": {
      fontStyle: "italic",
    },
    // Links, code blocks within markdown should inherit or be styled by markdown-to-jsx processor
  },

  // Animaciones CSS-in-JS (can be used by components)
  animations: {
    glowPulse: { /* ...keyframes... */ },
    successGlow: { /* ...keyframes... */ },
    errorPulse: { /* ...keyframes... */ },
    slideDown: { /* ...keyframes... */ },
    fadeIn: {
      from: { opacity: 0, transform: "translateY(10px)" },
      to: { opacity: 1, transform: "translateY(0)" },
    },
  },

  // Status Indicators (structural parts, colors come from theme in component)
  statusIndicator: { // Base structure
    display: "inline-block",
    borderRadius: "4px", // theme.borderRadius.small
    border: "1px solid transparent", // Component will set themed border color
    // transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)", // theme.transitions.medium
    position: "relative",
    flexShrink: 0,
  },
  statusIndicatorSmall: { width: "10px", height: "10px", marginRight: "8px" /* theme.spacing.small */ },
  statusIndicatorMedium: { width: "14px", height: "14px", marginRight: "12px" /* theme.spacing.medium */ },
  statusIndicatorLarge: { width: "18px", height: "18px", marginRight: "16px" /* theme.spacing.large */ },

  // Feedback Cards (structural parts, colors/backgrounds from theme in component)
  feedbackCard: { // Base structure for FeedbackCard and historical system messages
    padding: "12px 16px", // theme.spacing.medium theme.spacing.medium/large
    marginBottom: "8px", // theme.spacing.small
    borderRadius: "8px", // theme.borderRadius.medium
    borderLeft: "3px solid transparent", // Component sets themed color
    fontSize: "13px", // theme.typography.small
    lineHeight: "1.5",
    display: "flex",
    alignItems: "flex-start",
    // color, background, backdropFilter, border (main) from theme in component
    // transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", // theme.transitions.fast
    position: "relative",
    overflow: "hidden",
    // Hover effects are better applied via inline styles in component or specific CSS classes
    // "&:hover": { /* component handles hover with theme values */ },
  },

  feedbackCardContent: { // Used by FeedbackCard
    flex: 1,
    display: "flex",
    alignItems: "flex-start",
    gap: "12px", // theme.spacing.medium
  },

  feedbackCardText: { // Used by FeedbackCard
    flex: 1,
    margin: 0,
    fontWeight: "400", // Base font weight
    letterSpacing: "0.01em",
  },

  // Mensajes regulares (User/Assistant) - Structural base
  // Components (Message.jsx, UserMessage.jsx) apply theme colors, backgrounds, specific borders.
  messageContainer: {
    marginBottom: "20px", // theme.spacing.large
    padding: "16px 20px", // theme.spacing.medium theme.spacing.large
    borderRadius: "12px", // theme.borderRadius.large
    maxWidth: "85%",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap", // Important for preserving formatting
    // transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", // theme.transitions.fast
    // boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)", // theme.shadows.small / medium
    // animation: "fadeIn 0.4s ease-out", // applied by class or component
    // background, color, border, backdropFilter applied by component using theme
  },

  // messageContainerUser and messageContainerAssistant are primarily for alignSelf,
  // specific styling is done in the component with theme.
  messageContainerUser: {
    alignSelf: "flex-end",
  },
  messageContainerAssistant: {
    alignSelf: "flex-start",
  },

  messageHeader: { // Structural style for message sender name
    fontWeight: "600",
    marginBottom: "8px", // theme.spacing.small
    fontSize: "13px", // theme.typography.small
    letterSpacing: "0.01em",
    // color applied by component using theme
  },

  messageContent: { // Wrapper for actual message text/markdown
    fontSize: "14px", // theme.typography.text
    lineHeight: "1.6",
    letterSpacing: "0.01em",
  },

  messageTimestamp: {
    fontSize: "11px", // theme.typography.small
    // color: "rgba(255, 255, 255, 0.4)", // theme.colors.textMuted or similar
    marginTop: "8px", // theme.spacing.small
  },

  // Archivos adjuntos mejorados (structural)
  attachedFilesImproved: { // Used in Message.jsx
    display: "flex",
    gap: "8px", // theme.spacing.small
    flexWrap: "wrap",
    marginTop: "12px", // theme.spacing.medium
  },

  fileTagImproved: { // Used in Message.jsx
    fontSize: "12px", // theme.typography.small
    // color: "#64B5F6", // theme.colors.primary or a specific tag color
    padding: "4px 8px", // theme.spacing.xs theme.spacing.small
    // background: "rgba(33, 150, 243, 0.1)", // theme.colors.primary + alpha, or secondary
    borderRadius: "6px", // theme.borderRadius.small
    display: "inline-block",
    marginRight: "8px", // theme.spacing.small
    marginBottom: "4px", // theme.spacing.xs
  },

  // Scrollbar personalizado (can be applied to scrollable containers)
  customScrollbar: {
    "&::-webkit-scrollbar": {
      width: "6px", // Or theme variable if scrollbar sizes are in theme
      height: "6px",
    },
    "&::-webkit-scrollbar-track": {
      background: "transparent", // Or theme.colors.background
    },
    "&::-webkit-scrollbar-thumb": {
      // background: "rgba(255, 255, 255, 0.2)", // theme.colors.border or scrollbarThumb
      borderRadius: "3px", // theme.borderRadius.xs or small
    },
    "&::-webkit-scrollbar-thumb:hover": {
      // background: "rgba(255, 255, 255, 0.3)", // theme.colors.borderHover or scrollbarThumbHover
    },
  },
};

// Función para aplicar animaciones CSS-in-JS
export const applyAnimation = (element, animationName, duration = "0.3s", easing = "ease-out") => {
  if (!element || !styles.animations[animationName]) return;

  const keyframes = styles.animations[animationName];
  // Ensure duration is a string like "0.3s" for parsing, or handle number directly
  const durationMs = typeof duration === 'string' ? parseFloat(duration) * 1000 : duration;
  
  const animation = element.animate(
    Object.values(keyframes), // Animate expects an array of keyframe objects
    {
      duration: durationMs,
      easing: easing,
      fill: "forwards",
    }
  );
  return animation;
};


// Función helper para combinar estilos
export const combineStyles = (...styleObjects) => {
  return Object.assign({}, ...styleObjects.filter(Boolean)); // Filter out null/undefined styles
};

// Función para aplicar hover effects (less used if components handle hover with theme)
export const applyHoverEffect = (baseStyle, hoverStyle) => {
  return {
    ...baseStyle,
    "&:hover": {
      ...(baseStyle["&:hover"] || {}), // Preserve existing hover styles if any
      ...hoverStyle,
    },
  };
};