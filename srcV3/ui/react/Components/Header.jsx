import React, { memo, useEffect, useState } from "react";
import { useVSCodeContext } from "../context/VSCodeContext";

const styles = {
  header: {
    padding: "10px",
    borderBottom: "1px solid var(--vscode-sideBar-border)",
    fontSize: "14px",
    fontWeight: "bold",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  buttonsContainer: {
    display: "flex",
    gap: "8px",
  },
  button: {
    backgroundColor: "var(--vscode-button-secondaryBackground)",
    color: "var(--vscode-button-foreground)",
    border: "none",
    padding: "6px",
    borderRadius: "3px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
  },
  buttonsContainer: {
    display: "flex",
    flexDirection: "row",
    gap: "8px",
  },
};

const Header = memo(() => {
  const { postMessage, currentModel } = useVSCodeContext();
  const [showHistory, setShowHistory] = useState(false);

  const handleModelChange = event => {
    const newModel = event.target.value;
    postMessage('command', {
      command: 'setModel',
      data: newModel
    });
  };

  const handleNewChat = () => {
    postMessage('command', {
      command: 'newChat'
    });
  };

  const toggleHistory = () => {
    setShowHistory(prev => !prev);
    postMessage('command', {
      command: 'toggleHistory'
    });
  };

  return (
    <header style={styles.header}>
    
        <button onClick={handleNewChat} style={styles.button}>
          New Chat
        </button>
        <button onClick={toggleHistory} style={styles.button}>
          {showHistory ? 'Hide History' : 'Show History'}
        </button>
    
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
});

export default Header;