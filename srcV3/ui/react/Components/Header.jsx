import React, { memo, useContext } from "react";
import { useVSCodeContext } from "../context/VSCodeContext";

const Header = () => {
  const { currentModel, postMessage, theme } = useVSCodeContext();

  try {
    const handleModelChange = (event) => {
      const newModel = event.target.value;
      postMessage('command', { 
        command: 'setModel', 
        data: newModel 
      });
    };

    const handleNewChat = () => {
      postMessage('command', { command: 'newChat' });
    };

    const handleShowHistory = () => {
      postMessage('command', { command: 'showHistory' });
    };

    const styles = {
      header: {
        padding: theme.spacing.medium,
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderRadius: `0 0 ${theme.borderRadius.medium} ${theme.borderRadius.medium}`,
        boxShadow: `0 2px 4px ${theme.colors.border}`
      },
      title: {
        fontSize: theme.typography.title,
        fontWeight: "bold"
      },
      button: {
        backgroundColor: theme.colors.secondary,
        color: theme.colors.text,
        border: `1px solid ${theme.colors.border}`,
        padding: `${theme.spacing.small} ${theme.spacing.medium}`,
        borderRadius: theme.borderRadius.small,
        fontSize: theme.typography.text,
        cursor: "pointer",
        '&:hover': {
          opacity: 0.9
        }
      },
      buttonsContainer: {
        display: "flex",
        gap: "8px",
      },
      closeButton: {
        backgroundColor: "var(--vscode-errorForeground)",
      },
      select: {
        backgroundColor: "var(--vscode-dropdown-background)",
        color: "var(--vscode-dropdown-foreground)",
        border: "1px solid var(--vscode-dropdown-border)",
        padding: "4px 8px",
        borderRadius: "2px",
        fontSize: "12px",
        outline: "none",
      }
    };

    return (
      <header style={styles.header}>
        <div style={styles.buttonsContainer}>
          <button onClick={handleNewChat} style={styles.button}>
            New Chat
          </button>
          <button onClick={handleShowHistory} style={styles.button}>
            History
          </button>
        </div>
        <select 
          value={currentModel} 
          onChange={handleModelChange} 
          style={styles.select}
        >
          <option value="ollama">Ollama</option>
          <option value="gemini">Gemini</option>
        </select>
      </header>
    );
  } catch (error) {
    console.error("Error en Header:", error);
    return (
      <header style={styles.header}>
        <div>Extension Assistant</div>
      </header>
    );
  }
};

export default memo(Header);
