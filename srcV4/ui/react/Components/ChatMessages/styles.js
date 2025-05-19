// ui/Components/ChatMessages/styles.js
export const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    padding: "10px",
    overflow: "hidden", // Prevent container from scrolling
  },
  virtualListContainer: {
    height: "100%",
    width: "100%",
    flex: 1,
    overflow: "auto", // Enable scrolling
  },
  scrollableContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    flex: 1,
    overflow: "auto", // Enable scrolling
    paddingRight: "5px", // Add some padding for the scrollbar
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
    backgroundColor: 'var(--vscode-editor-background)',
    borderLeft: '4px solid var(--vscode-activityBarBadge-background)',
    padding: '10px',
    margin: '10px 0',
    borderRadius: '4px',
    alignSelf: 'flex-start', 
  },
  agentMessageContent: {
    color: 'var(--vscode-foreground)',
    fontSize: '14px',
  },
  codeBlockContainer: {
    margin: '1em 0',
    borderRadius: '4px',
    overflow: 'hidden',
    backgroundColor: 'var(--vscode-input-background)',
    border: '1px solid var(--vscode-input-border)',
  },
  codeBlockHeader: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '8px 16px',
    borderBottom: '1px solid var(--vscode-input-border)',
  },
  filename: {
    fontFamily: 'Consolas, Monaco, monospace',
    marginRight: 'auto',
    color: 'var(--vscode-foreground)',
  },
  buttonContainer: {
    display: 'flex',
    gap: '8px',
  },
  button: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--vscode-foreground)',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: 'var(--vscode-toolbar-hoverBackground)',
    },
  },
  pre: {
    margin: 0,
    padding: '1em',
    overflow: 'auto',
    fontSize: '14px',
    lineHeight: '1.5',
    color: 'var(--vscode-foreground)',
    '&::WebkitScrollbar': {
      width: '8px',
      height: '8px',
    },
    '&::WebkitScrollbarTrack': {
      background: 'transparent',
    },
    '&::WebkitScrollbarThumb': {
      background: 'var(--vscode-scrollbarSlider-background)',
      borderRadius: '4px',
      '&:hover': {
        background: 'var(--vscode-scrollbarSlider-hoverBackground)',
      },
    },
  },
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
  markdownContent: {
    padding: '8px',
    lineHeight: '1.5',
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      marginTop: '16px',
      marginBottom: '8px',
      fontWeight: 'bold',
    },
    '& p': {
      marginBottom: '8px',
    },
    '& ul, & ol': {
      paddingLeft: '20px',
      marginBottom: '8px',
    },
    '& strong': {
      fontWeight: 'bold',
    },
    '& em': {
      fontStyle: 'italic',
    },
  },
};
