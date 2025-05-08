import React from 'react';
import { useVSCodeContext } from '../context/VSCodeContext';

const ChatList = ({ chats, onChatClick }) => {
  const { theme } = useVSCodeContext();

  const styles = {
    list: {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.small
    },
    chatItem: {
      padding: theme.spacing.medium,
      borderRadius: theme.borderRadius.medium,
      backgroundColor: theme.colors.secondary,
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: theme.colors.primary
      }
    }
  };

  return (
    <div style={styles.list}>
      {chats.map(chat => (
        <div 
          key={chat.id} 
          style={styles.chatItem}
          onClick={() => onChatClick(chat.id)}
        >
          {chat.title}
        </div>
      ))}
    </div>
  );
};

export default ChatList;