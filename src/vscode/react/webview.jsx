import React, { useContext, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import ChatInput from "./Components/InputChat/ChatInput";

// Import components statically
import ChatHistory from "./historical/ChatHistory";
import RecentChats from "./historical/RecentChats";
import ChatMessages from "./Components/ChatMessages/ChatMessages";
import { ProcessingStatus, PerformanceMetrics } from "./Components/ProcessingStatus";

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
  const { messages, currentChatId } = useVSCodeContext(); // Obtener currentChatId
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

  return (
    <div style={containerStyle}>
      <ChatHistory /> {/* Se muestra condicionalmente basado en showHistory desde el contexto */}
      {isEmpty ? (
        <div style={emptyStateContainer}>
          <ChatInput /> {/* ChatInput primero en el DOM, pero abajo visualmente por column-reverse */}
          <RecentChats />
        </div>
      ) : (
        <>
          <div style={styles.content}>
            <ChatMessages>
              {/* RecentChats no debería estar dentro de ChatMessages si ChatMessages es solo para la lista de mensajes */}
              {/* Se podría mostrar RecentChats en otro lugar o no mostrarlo cuando hay mensajes */}
            </ChatMessages>
            <ProcessingStatus /> {/* Este componente muestra el estado de procesamiento */}
            {/* Pasar currentChatId al componente PerformanceMetrics */}
            <PerformanceMetrics chatId={currentChatId} /> 
          </div>
          <div style={{display: 'flex', justifyContent: 'center', padding: '0 12px', backgroundColor: 'var(--vscode-sideBar-background)'}}>
            <ChatInput />
          </div>
        </>
      )}
    </div>
  );
}

// const vscode = window.vscode; // Ya no es necesario aquí, VSCodeProvider lo maneja

if (window.vscode) {
  console.log('VS Code API is available in webview.jsx');
} else {
  console.error('VS Code API is not available in webview.jsx');
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