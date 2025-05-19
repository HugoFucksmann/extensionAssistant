import React, { useContext } from "react";
import ReactDOM from "react-dom";
import ChatInput from "./Components/InputChat/ChatInput";

// Import components statically instead of using lazy loading
import ChatHistory from "./historical/ChatHistory";
import RecentChats from "./historical/RecentChats";
import ChatMessages from "./Components/ChatMessages/ChatMessages";

import { VSCodeProvider, useVSCodeContext } from "./context/VSCodeContext";

// Debug message
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

// Main component
function Chat() {
  const { messages } = useVSCodeContext();
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
    flexDirection: 'column-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'calc(100vh - 40px)',
    width: '100%',
    padding: '20px',
    boxSizing: 'border-box',
    gap: '16px',
    overflow: 'hidden'
  };

  return (
    <div style={containerStyle}>
      <ChatHistory />
      {isEmpty ? (
        <div style={emptyStateContainer}>
          <RecentChats />
          <ChatInput />
        </div>
      ) : (
        <>
          <div style={styles.content}>
            <ChatMessages>
              <RecentChats />
            </ChatMessages>
          </div>
          <div style={{display: 'flex', justifyContent: 'center', padding: '0 12px', backgroundColor: 'var(--vscode-sideBar-background)'}}>
            <ChatInput />
          </div>
        </>
      )}
    </div>
  );
}


/** 
 * @type {{
 *   postMessage: (msg: {type: string, [key: string]: any}) => void,
 *   getState: () => {modelType?: string},
 *   setState: (state: object) => void
 * }} 
 */
let vscode;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  console.error('Error acquiring vscode API:', error);
  vscode = {
      postMessage: (msg) => console.log('[Mock] postMessage:', msg),
      getState: () => ({ modelType: 'gemini' }),
      setState: (state) => console.log('[Mock] setState:', state)
  };
}

// Function to render the application with improved error handling
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
    // Fallback to show something in case of error
    const safeError = error instanceof Error ? error.message : String(error);
    root.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h2>Error loading UI</h2>
        <pre>${safeError.replace(/[{}]/g, match => match === '{' ? '\{' : '\}')}</pre>
      </div>
    `;
  }
}

// Start the application
renderApp();