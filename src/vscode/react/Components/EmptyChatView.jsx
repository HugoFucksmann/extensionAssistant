// src/vscode/webView/Components/EmptyChatView.tsx
import React from 'react';
import ChatInput from './InputChat/ChatInput';
import { useApp } from '../context/AppContext';

const EmptyChatView = () => {
  const { theme } = useApp(); 

  const styles = {
    container: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.large,
      gap: '24px',
      height: '100%', 
    },
    welcomeTextContainer: {
      textAlign: 'center',
    },
    title: {
      fontSize: theme.typography.title,
      color: theme.colors.text,
      marginBottom: theme.spacing.small,
    },
    subtitle: {
      fontSize: theme.typography.subtitle,
      color: theme.colors.text, 
      opacity: 0.7,
    },
    inputContainer: {
      width: '100%',
      maxWidth: '600px', 
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.welcomeTextContainer}>
        <h2 style={styles.title}>Extension Assistant</h2>
        <p style={styles.subtitle}>How can I help you today?</p>
      </div>
      <div style={styles.inputContainer}>
        <ChatInput />
      </div>
    </div>
  );
};

export default EmptyChatView;