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
      Loading initial chat...
    </div>
  );
};

const App = () => {
  const { messages, isLoading, showHistory, theme, activeFeedbackOperationId } = useApp();
  const isEmpty = messages.length === 0;

  // Main container styles
  const appContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    overflow: 'hidden', 
  };

  // Header style (not used in this simplified layout, but kept for potential future use)
  // const headerStyle = { ... };
  // const titleStyle = { ... };
  // const newChatButtonStyle = { ... };

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

  // Show top-level loading only if it's initial load, no messages, and no active feedback operation
  const showTopLevelLoading = isLoading && isEmpty && !activeFeedbackOperationId;
  // Show empty view if no messages and no active feedback operation (and not loading)
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
            <ChatMessages /> {/* ChatMessages now includes UnifiedFeedbackDisplay for active operations */}
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