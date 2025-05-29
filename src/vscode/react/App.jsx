import React from 'react';
import { getThemeCSSVariables } from './theme/theme';

import ChatInput from './Components/InputChat/ChatInput';
import ChatMessages from './Components/ChatMessages/ChatMessages';
import ChatHistory from './Components/historical/ChatHistory';
import EmptyChatView from './Components/EmptyChatView';
import { useApp } from './context/AppContext';





const LoadingIndicator = () => {
  const { theme } = useApp();
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: theme.colors.text }}>
      Loading initial chat...
    </div>
  );
};

const App = () => {
  const { messages, isLoading, showHistory, theme, activeFeedbackOperationId } = useApp();
  const isEmpty = messages.length === 0;

  // Inyectar variables CSS del tema
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

 
  const showTopLevelLoading = isLoading && isEmpty && !activeFeedbackOperationId;

  const showEmptyView = isEmpty && !activeFeedbackOperationId && !showTopLevelLoading;

  return (
    <div style={appContainerStyle}>
      <main style={chatAreaStyle}>
        {showTopLevelLoading ? (
          <LoadingIndicator />
        ) : showEmptyView ? (
          <EmptyChatView />
        ) : (
          <>
            <ChatMessages />
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