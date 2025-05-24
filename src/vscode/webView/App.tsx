import React, { useState } from 'react';
import { useApp } from '../react/context/AppContext';

// ChatInput Component
const ChatInput = () => {
  const [input, setInput] = useState('');
  const { sendMessage, isLoading } = useApp();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
        disabled={isLoading}
        style={{
          flex: 1,
          padding: '8px 12px',
          border: '1px solid var(--vscode-input-border)',
          borderRadius: '4px',
          backgroundColor: 'var(--vscode-input-background)',
          color: 'var(--vscode-input-foreground)',
          outline: 'none',
        }}
      />
      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        style={{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '4px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: (!input.trim() || isLoading) ? 0.6 : 1,
        }}
      >
        {isLoading ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
};

// ChatMessages Component
const ChatMessages = () => {
  const { messages } = useApp();

  return (
    <div style={{ padding: '16px' }}>
      {messages.map((message) => (
        <div
          key={message.id}
          style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: message.sender === 'user' 
              ? 'var(--vscode-textCodeBlock-background)' 
              : 'var(--vscode-editor-background)',
            border: `1px solid var(--vscode-panel-border)`,
          }}
        >
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: '4px',
            color: message.sender === 'user' ? 'var(--vscode-textLink-foreground)' : 'var(--vscode-foreground)'
          }}>
            {message.sender === 'user' ? 'You' : message.sender === 'assistant' ? 'Assistant' : 'System'}
          </div>
          <div>{message.content}</div>
          <div style={{ 
            fontSize: '11px', 
            color: 'var(--vscode-descriptionForeground)', 
            marginTop: '4px' 
          }}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
};

// RecentChats Component
const RecentChats = () => {
  const { setShowHistory } = useApp();

  return (
    <div style={{ padding: '16px', textAlign: 'center' }}>
      <h3>Recent Chats</h3>
      <p style={{ color: 'var(--vscode-descriptionForeground)' }}>
        No recent chats available
      </p>
      <button 
        onClick={() => setShowHistory(false)}
        style={{
          marginTop: '16px',
          padding: '8px 16px',
          border: 'none',
          borderRadius: '4px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          cursor: 'pointer',
        }}
      >
        Start New Chat
      </button>
    </div>
  );
};

// Main App Component
const App = () => {
  const { messages, isLoading, showHistory, newChat } = useApp();
  const isEmpty = messages.length === 0;

  if (showHistory) {
    return <RecentChats />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {!isEmpty && (
        <header style={{ 
          padding: '8px 16px', 
          borderBottom: '1px solid var(--vscode-sideBar-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0 }}>Chat</h3>
          <button 
            onClick={newChat}
            style={{
              padding: '4px 8px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            + New Chat
          </button>
        </header>
      )}
      
      {isEmpty ? (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '24px',
          padding: '16px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2>Extension Assistant</h2>
            <p style={{ color: 'var(--vscode-descriptionForeground)' }}>
              How can I help you today?
            </p>
          </div>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <ChatInput />
          </div>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <ChatMessages />
          </div>
          <div style={{ padding: '12px', borderTop: '1px solid var(--vscode-sideBar-border)' }}>
            <ChatInput />
          </div>
        </>
      )}
    </div>
  );
};

export default App;