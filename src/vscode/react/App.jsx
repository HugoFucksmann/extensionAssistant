import React from 'react';

// Componentes de la interfaz
import ChatInput from './Components/InputChat/ChatInput';
import ChatMessages from './Components/ChatMessages/ChatMessages';
import ChatHistory from './Components/historical/ChatHistory';
import EmptyChatView from './Components/EmptyChatView';
import { useApp } from './context/AppContext';

// A simple loading spinner or message
const LoadingIndicator = () => {
  const { theme } = useApp();
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: theme.colors.text }}>
      Loading...
    </div>
  );
};

const App = () => {
  const { messages, isLoading, showHistory, newChat, theme } = useApp();
  const isEmpty = messages.length === 0;

  // Main container styles
  const appContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    overflow: 'hidden', // Prevent body scroll, individual components handle their scroll
  };

  const headerStyle = {
    padding: `${theme.spacing.medium} ${theme.spacing.large}`,
    borderBottom: `1px solid ${theme.colors.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.background, // Or a slightly different header background
  };

  const titleStyle = {
    margin: 0,
    fontSize: theme.typography.title, // Example
  };

  const newChatButtonStyle = {
    padding: `${theme.spacing.small} ${theme.spacing.medium}`,
    border: 'none',
    borderRadius: theme.borderRadius.small,
    backgroundColor: theme.colors.primary, // Use theme colors
    color: '#ffffff', // Assuming primary button text is white
    cursor: 'pointer',
    fontSize: '13px', // Example
  };

  const chatAreaStyle = {
    flex: 1, // Takes remaining space
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden', // Important for ChatMessages to scroll correctly
  };

  const chatInputContainerStyle = {
    padding: theme.spacing.medium,
    borderTop: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.background, // Or chat input specific background
  };


  if (showHistory) {
    return (
      <div style={appContainerStyle}>
        <ChatHistory />
      </div>
    );
  }

  return (
    <div style={appContainerStyle}>
    

      <main style={chatAreaStyle}>
        {isLoading && isEmpty ? ( // Show loading indicator only if messages are empty and loading
          <LoadingIndicator />
        ) : isEmpty ? (
          <EmptyChatView />
        ) : (
          <>
            <ChatMessages>
                {/* Children for ChatMessages if it's designed to show something when empty,
                    otherwise EmptyChatView handles the "truly empty" state.
                    If ChatMessages is self-contained, you might not need children here.
                */}
            </ChatMessages>
            <div style={chatInputContainerStyle}>
              <ChatInput />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;