import React from 'react';
import { getThemeCSSVariables } from './theme/theme';
import ChatInput from './Components/InputChat/ChatInput';
import ChatHistory from './Components/historical/ChatHistory';
import { useApp } from './context/AppContext';
import ChatMessages from './Components/ChatMessages/new/ChatMessages';


const App = () => {
  const {showHistory, theme } = useApp();
 
  const appContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    ...getThemeCSSVariables(theme),
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    overflow: 'hidden',
  };

  const chatAreaStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const chatInputContainerStyle = {
    padding: theme.spacing.medium,
    borderTop: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.chatInputBg || theme.colors.background,
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
            <ChatMessages />
            <div style={chatInputContainerStyle}>
              <ChatInput />
            </div>
      </main>
    </div>
  );
};

export default App;