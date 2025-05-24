import React, { useContext, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import ChatInput from "./Components/InputChat/ChatInput";

// Import components statically
import ChatHistory from "./historical/ChatHistory";
import RecentChats from "./historical/RecentChats";
import ChatMessages from "./Components/ChatMessages/ChatMessages";

import { VSCodeProvider, useVSCodeContext } from "./context/VSCodeContext";

console.log('Webview script loaded');

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    maxHeight: '100vh',
    color: 'var(--vscode-foreground)',
    backgroundColor: 'var(--vscode-sideBar-background)',
    overflow: 'hidden',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%'
  },
};

function Chat() {
  const { messages, currentChatId, newChat, chatList } = useVSCodeContext();
  const isEmpty = messages.length === 0;

  const containerStyle = {
    ...styles.container,
    ...(isEmpty && {
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    })
  };

  const emptyStateContainer = {
    display: 'flex',
    flexDirection: 'column-reverse', // ChatInput abajo, RecentChats arriba
    alignItems: 'center',
    justifyContent: 'center', // Centrar verticalmente
    height: 'calc(100vh - 40px)', // Ajustar altura si es necesario
    width: '100%',
    padding: '20px',
    boxSizing: 'border-box',
    gap: '16px',
    overflow: 'hidden' // Evitar scroll en el contenedor del estado vacío
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: 'var(--vscode-sideBar-background)',
    borderBottom: '1px solid var(--vscode-sideBar-border)'
  };

  const newChatButtonStyle = {
    padding: '4px 8px',
    backgroundColor: 'var(--vscode-button-background)',
    color: 'var(--vscode-button-foreground)',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  };

  return (
    <div style={containerStyle}>
      {!isEmpty && (
        <div style={headerStyle}>
          <h3>Chat</h3>
          <button 
            onClick={newChat}
            style={newChatButtonStyle}
            title="Start a new chat"
          >
            <span>+</span> New Chat
          </button>
        </div>
      )}
      <ChatHistory />
      {isEmpty ? (
        <div style={emptyStateContainer}>
          <ChatInput />
          <RecentChats />
        </div>
      ) : (
        <>
          <div style={styles.content}>
            <ChatMessages />
          
 
          </div>
          <div style={{display: 'flex', justifyContent: 'center', padding: '0 12px', backgroundColor: 'var(--vscode-sideBar-background)'}}>
            <ChatInput />
          </div>
        </>
      )}
    </div>
  );
}

// Check for VS Code API availability
if (!window.vscode) {
  console.error('VS Code API is not available in webview.jsx');
  // Show error in the UI
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="padding: 20px; color: #f85149;">
          <h2>Error: VS Code API not available</h2>
          <p>Please make sure you're running this inside VS Code's webview.</p>
        </div>
      `;
    }
  });
} else {
  console.log('VS Code API is available in webview.jsx');
}

function renderApp() {
  const root = document.getElementById("root");
  if (!root) {
    console.error('Root element not found');
    return;
  }

  try {
    console.log('Rendering React app');
    ReactDOM.render(
      <VSCodeProvider>
        <Chat />
      </VSCodeProvider>,
      root
    );
    console.log('React app rendered successfully');
  } catch (error) {
    console.error('Error rendering React app:', error);
    root.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h2>Error loading UI</h2>
        <pre>${error.message || JSON.stringify(error)}</pre>
      </div>
    `;
  }
}

renderApp();