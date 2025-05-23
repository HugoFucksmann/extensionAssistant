// src/ui/webview.jsx
import React, { useEffect } from "react"; // Quitar useState si no se usa aquí
import ReactDOM from "react-dom";
import ChatInput from "./Components/InputChat/ChatInput"; // Ajusta la ruta
import ChatHistory from "./historical/ChatHistory"; // Ajusta la ruta
import RecentChats from "./historical/RecentChats"; // Ajusta la ruta
import ChatMessages from "./Components/ChatMessages/ChatMessages"; // Ajusta la ruta
import { VSCodeProvider, useVSCodeContext } from "./context/VSCodeContext"; // Ajusta la ruta

console.log('Webview script loaded');

const styles = {
  // ... (tus estilos existentes, sin cambios)
  container: { /* ... */ },
  content: { /* ... */ },
  emptyStateContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'calc(100vh - 40px)', // Asumiendo un input de 40px
    width: '100%',
    padding: '20px',
    boxSizing: 'border-box',
    gap: '16px',
    textAlign: 'center',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid var(--vscode-divider-background)',
    flexShrink: 0,
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden', // El scroll lo maneja ChatMessages
  },
  inputWrapper: {
    padding: '8px 12px',
    borderTop: '1px solid var(--vscode-divider-background)',
    backgroundColor: 'var(--vscode-sideBar-background)', // o editorGroupHeader.tabsBackground
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 'var(--vscode-font-size)', // Usa variables de VS Code
    fontWeight: 'bold',
  },
  button: { // Estilo base para botones
    padding: '4px 8px',
    backgroundColor: 'var(--vscode-button-background)',
    color: 'var(--vscode-button-foreground)',
    border: '1px solid var(--vscode-button-border, var(--vscode-button-background))',
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '12px',
  },
};

function ChatApp() {
  const {
    messages,
    currentChatId,
    isLoading,
    showHistory,
    requestNewChat, // Usar la acción renombrada
    setShowHistory,
    // postCommandToBackend // Para solicitar lista de chats si es necesario
  } = useVSCodeContext();

  // Solicitar lista de chats al montar si no está en el historial
  // Esto es opcional, podría hacerse cuando se muestra el historial
  // useEffect(() => {
  //   postCommandToBackend('webview:requestChatList');
  // }, [postCommandToBackend]);

  const handleShowHistory = () => {
    setShowHistory(true);
  };

  const handleHideHistory = () => {
    setShowHistory(false);
  };


  if (showHistory) {
    return (
      <div style={styles.container}>
        <ChatHistory onBack={handleHideHistory} />
      </div>
    );
  }

  const isEmptySession = !currentChatId && messages.length === 0 && !isLoading;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>AI Chat</h3>
        <div>
          <button style={{...styles.button, marginRight: '8px'}} onClick={handleShowHistory} title="Chat History">
            History
          </button>
          <button style={styles.button} onClick={requestNewChat} title="Start New Chat">
            + New Chat
          </button>
        </div>
      </div>

      {isEmptySession ? (
        <div style={styles.emptyStateContainer}>
          <p>No active chat. Start a new one or load from history.</p>
          <RecentChats onChatSelect={(chatId) => { /* useVSCodeContext().loadChat(chatId) */ }} />
          {/* RecentChats necesitaría acceso a loadChat del contexto o pasarlo como prop */}
        </div>
      ) : (
        <div style={styles.chatArea}>
          <ChatMessages /> {/* ChatMessages internamente usa useVSCodeContext para messages, isLoading */}
        </div>
      )}
      
      {/* El input se muestra siempre que no estemos en la vista de historial */}
      {/* Se deshabilita si isLoading o si no hay currentChatId (a menos que queramos que cree uno nuevo al enviar) */}
      <div style={styles.inputWrapper}>
        <ChatInput disabled={isLoading || !currentChatId} />
      </div>
    </div>
  );
}

// ... (código de renderizado de ReactDOM, sin cambios)
function renderApp() {
  const root = document.getElementById("root");
  if (!root) {
    console.error('Root element not found');
    return;
  }
  try {
    ReactDOM.render(
      <VSCodeProvider>
        <ChatApp />
      </VSCodeProvider>,
      root
    );
  } catch (error) {
    console.error('Error rendering React app:', error);
    root.innerHTML = `<div style="padding: 20px; color: red;"><h2>Error loading UI</h2><pre>${error.message || JSON.stringify(error)}</pre></div>`;
  }
}

// Asegurar que window.vscode esté disponible antes de renderizar
if (window.vscode) {
    renderApp();
} else {
    // Podrías tener un listener para cuando esté disponible si se carga asíncronamente,
    // pero usualmente en webviews de VS Code está disponible de inmediato.
    console.error("VS Code API (window.vscode) not found at initial load.");
    // Intentar renderizar de todas formas, MessageService lo manejará.
    renderApp();
}