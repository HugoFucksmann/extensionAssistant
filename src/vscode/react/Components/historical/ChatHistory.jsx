import React from "react";
import ChatList from "./ChatList";
import { useApp } from "../../context/AppContext";

const ChatHistory = () => {
  const { theme, chatList, loadChat, showHistory, setShowHistory } = useApp();

  const styles = {
    container: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.background, // Usar theme
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
      padding: `0px ${theme.spacing.large}`, // Usar theme
    },
    header: {
      padding: theme.spacing.medium, // Usar theme
      borderBottom: `1px solid ${theme.colors.border}`, // Usar theme
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      color: theme.colors.text, // Usar theme
    },
    button: {
      backgroundColor: theme.colors.secondary, // Usar theme
      color: theme.colors.text, // Usar theme
      border: `1px solid ${theme.colors.border}`, // Usar theme
      padding: `${theme.spacing.xs} ${theme.spacing.small}`, // Usar theme
      borderRadius: theme.borderRadius.small, // Usar theme
      cursor: "pointer",
      fontSize: theme.typography.small, // Usar theme
    },
    noChatsText: {
        padding: theme.spacing.medium,
        textAlign: "center",
        color: theme.colors.textMuted,
    }
  };

  if (!showHistory) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3>Chat History</h3>
        <button onClick={() => setShowHistory(false)} style={styles.button}>
          Close
        </button>
      </div>
      {chatList.length > 0 ? (
        <ChatList chats={chatList} onChatClick={loadChat} />
      ) : (
        <div style={styles.noChatsText}>
          No hay chats guardados
        </div>
      )}
    </div>
  );
};

export default ChatHistory;