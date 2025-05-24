import React from 'react';

import ChatList from './ChatList';
import { useApp } from '../../context/AppContext';

export const RecentChats = () => {
  const { 
    theme, 
    chatList = [], 
    loadChat, 
    postMessage, 
    showHistory, 
    setShowHistory,
    isLoading 
  } = useApp();

  const styles = {
    container: {
      width: '100%',
      maxWidth: 'calc(100% - 24px)',
      borderRadius: '8px',
      backgroundColor: theme.colors.background,
      padding: '12px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      boxSizing: 'border-box',
      margin: '0 auto'
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

  const handleShowHistory = () => {
    const newShowHistory = !showHistory;
    setShowHistory(newShowHistory);
    
    // Only request history if we're showing it
    if (newShowHistory) {
      postMessage('command', { command: 'getChatHistory' });
    }
  };

  if (isLoading && chatList.length === 0) {
    return (
      <div style={styles.container}>
        <p style={styles.noChatsText}>Loading chats...</p>
      </div>
    );
  }

  if (!chatList || chatList.length === 0) {
    return (
      <div style={styles.container}>
        <p style={styles.noChatsText}>No saved chats</p>
      </div>
    );
  }

  // Ensure we have valid timestamps and sort by most recent
  const recentChats = chatList
    .filter(chat => chat && chat.timestamp)
    .sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    })
    .slice(0, 4);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Recent Chats</h2>
        <button 
          style={styles.viewMoreButton} 
          onClick={handleShowHistory}
        >
          {showHistory ? 'Ocultar' : 'Ver más'}
        </button>
      </div>
      <ChatList chats={recentChats} onChatClick={loadChat} />
    </div>
  );
};

export default RecentChats;