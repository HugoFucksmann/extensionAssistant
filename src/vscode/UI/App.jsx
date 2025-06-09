import React from 'react';
import './global.css';
import { getThemeCSSVariables } from './theme/theme';
import ChatInput from './Components/InputChat/ChatInput';
import ChatHistory from './Components/historical/ChatHistory';
import { useApp } from './context/AppContext';
import { ChatMessages } from './Components/chatM/ChatMessages';
import RecentChats from './Components/historical/RecentChats';
import { StatusIndicator } from './Components/chatM/StatusIndicator';

const App = () => {
  const { showHistory, theme, messages = [], isLoading, loadingText } = useApp();
 
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

  const centeredContentStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.large,
    gap: theme.spacing.large,
  };

  const chatInputContainerStyle = {
    position: 'relative',
    margin: theme.spacing.medium,
    flexShrink: 0,
  };

  if (showHistory) {
    return (
      <div style={appContainerStyle}>
        <ChatHistory />
      </div>
    );
  }

  const displayableMessages = messages.filter(msg => {
    const phase = msg.metadata?.phase;
    if (phase && (msg.metadata?.status === 'phase_started' || msg.metadata?.status === 'phase_completed')) {
      return !!msg.metadata?.toolName; 
    }
    return true;
  });

  const hasMessages = displayableMessages.length > 0;

  return (
    <div style={appContainerStyle}>
      <main style={chatAreaStyle}>
        {!hasMessages ? (
          <div style={centeredContentStyle}>
            <RecentChats />
            <div style={{ width: '100%', maxWidth: '800px' }}>
              <div style={chatInputContainerStyle}>
                <ChatInput />
                <StatusIndicator
                  isVisible={isLoading}
                  loadingText={loadingText}
                  size="small"
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ 
              flex: 1, 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <ChatMessages messages={messages} />
            </div>
            <div style={chatInputContainerStyle}>
            <StatusIndicator
                isVisible={isLoading}
                loadingText={loadingText}
                size="small"
              />
              <ChatInput />
             
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;