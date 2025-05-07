import React from "react";
import { useVSCodeContext } from "../context/VSCodeContext";
import ChatList from "./ChatList";

const styles = {
  container: {
    padding: "20px",
    maxWidth: "600px",
    margin: "0 auto",
  },
  title: {
    fontSize: "1.5em",
    marginBottom: "15px",
    color: "var(--vscode-foreground)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },
  viewMoreButton: {
    backgroundColor: "var(--vscode-button-background)",
    color: "var(--vscode-button-foreground)",
    border: "none",
    padding: "5px 10px",
    fontSize: "1em",
    cursor: "pointer",
  },
};

const RecentChats = () => {
  const { chatList, loadChat, postMessage } = useVSCodeContext();

  // History loading should be triggered by handleShowHistory in AppContext or on initial load

  if (!chatList || chatList.length === 0) {
    return <p>No hay chats guardados</p>;
  }

  const recentChats = chatList
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 4);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Recent Chats</h2>
        <button 
          style={styles.viewMoreButton} 
          onClick={() => postMessage('command', { command: 'showHistory' })}
        >
          Ver más
        </button>
      </div>
      <ChatList chats={recentChats} onChatClick={loadChat} />
    </div>
  );
};

export default RecentChats;