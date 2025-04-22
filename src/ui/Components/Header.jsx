import React, { memo } from "react";
import { useAppContext } from "../context/AppContext";
import { ACTIONS } from "../services/BackendService";

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
  }
};

const Header = () => {
  try {
    console.log("Renderizando Header");
    const { handleShowHistory, model, setModel, backendService } = useAppContext();

    const handleModelChange = (event) => {
      setModel(event.target.value);
    };

    const handleNewChat = () => {
      console.log("Enviando comando newChat al backend");
      // Enviar comando al backend para crear un nuevo chat
      backendService.send(ACTIONS.NEW_CHAT);
    };

    return (
      <header style={styles.header}>
        <button onClick={handleNewChat} style={styles.button}>
          New Chat
        </button>
        <button onClick={handleShowHistory} style={styles.button}>
          History
        </button>
        <select value={model} onChange={handleModelChange} style={styles.select}>
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
