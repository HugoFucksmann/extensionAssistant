import React from "react";
import { useAppContext } from "../context/AppContext";
import ChatList from "./ChatList";

const styles = {
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "var(--vscode-sideBar-background)",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "10px",
    borderBottom: "1px solid var(--vscode-sideBar-border)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  button: {
    backgroundColor: "var(--vscode-button-background)",
    color: "var(--vscode-button-foreground)",
    border: "none",
    padding: "4px 8px",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "12px",
  },
};

const ChatHistory = () => {
  try {
    console.log("Renderizando ChatHistory");
    const { history, handleLoadChat, showHistory, setShowHistory } = useAppContext();

    if (!showHistory) return null;

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3>Chat History</h3>
          <button onClick={() => setShowHistory(false)} style={styles.button}>
            Close
          </button>
        </div>
        <ChatList chats={history} onChatClick={handleLoadChat} />
        {history.length === 0 && (
          <div style={{ padding: "10px", textAlign: "center" }}>
            No hay chats guardados
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("Error en ChatHistory:", error);
    return null;
  }
};

export default ChatHistory;