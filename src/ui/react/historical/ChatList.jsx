import React from "react";

const styles = {
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  chatItem: {
    padding: "15px",
    borderRadius: "5px",
    backgroundColor: "var(--vscode-button-background)",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  chatHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "5px",
  },
  chatTitle: {
    fontWeight: "bold",
    color: "var(--vscode-button-foreground)",
  },
  timestamp: {
    fontSize: "0.8em",
    color: "var(--vscode-descriptionForeground)",
  },
  preview: {
    fontSize: "0.9em",
    color: "var(--vscode-descriptionForeground)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};

const ChatList = ({ chats, onChatClick }) => {
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div style={styles.list}>
      {chats.map((chat) => (
        <div
          key={chat.id}
          onClick={() => onChatClick(chat.id)}
          style={styles.chatItem}
        >
          <div style={styles.chatHeader}>
            <span style={styles.chatTitle}>{chat.title}</span>
            <span style={styles.timestamp}>
              {formatTimestamp(chat.timestamp)}
            </span>
          </div>
          {chat.preview && <div style={styles.preview}>{chat.preview}</div>}
        </div>
      ))}
    </div>
  );
};

export default ChatList;