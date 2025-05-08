import React from 'react';
import { useVSCodeContext } from '../context/VSCodeContext';
import ChatList from './ChatList';

export const RecentChats = () => {
  const { theme, chatList, loadChat, postMessage } = useVSCodeContext();

  const styles = {
    container: {
      padding: theme.spacing.large,
      maxWidth: "600px",
      margin: "0 auto",
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.medium
    },
    title: {
      fontSize: theme.typography.title,
      marginBottom: theme.spacing.large,
      color: theme.colors.text,
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.large,
    },
    viewMoreButton: {
      backgroundColor: theme.colors.secondary,
      color: theme.colors.text,
      border: `1px solid ${theme.colors.border}`,
      padding: `${theme.spacing.small} ${theme.spacing.medium}`,
      fontSize: theme.typography.text,
      borderRadius: theme.borderRadius.small,
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: theme.colors.primary,
        transform: 'translateY(-1px)'
      },
      '&:active': {
        transform: 'translateY(0)'
      }
    },
    noChatsText: {
      fontSize: theme.typography.text,
      color: theme.colors.text,
    },
  };

  // History loading should be triggered by handleShowHistory in AppContext or on initial load

  if (!chatList || chatList.length === 0) {
    return (
      <div style={styles.container}>
        <p style={styles.noChatsText}>No hay chats guardados</p>
      </div>
    );
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