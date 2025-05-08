import React from "react";
import ReactDOM from "react-dom";
import Header from "./Components/Header";
import ChatInput from "./Components/InputChat/ChatInput";

// Importar componentes de manera estática en lugar de usar lazy loading
import ChatHistory from "./historical/ChatHistory";
import RecentChats from "./historical/RecentChats";
import ChatMessages from "./Components/ChatMessages/ChatMessages";

import { VSCodeProvider } from "./context/VSCodeContext";

// Mensaje de depuración
console.log('Webview script cargado');

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    color: "var(--vscode-foreground)",
    backgroundColor: "var(--vscode-sideBar-background)",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "auto",
  },
};

// Componente principal
function Chat() {
  console.log('Renderizando componente Chat');
  return (
    <div style={styles.container}>
      <Header />
      <ChatHistory />
      <div style={styles.content}>
        <ChatMessages>
          <RecentChats />
        </ChatMessages>
      </div>
      <ChatInput />
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
  console.error('Error al adquirir vscode API:', error);
  vscode = {
      postMessage: (msg) => console.log('[Mock] postMessage:', msg),
      getState: () => ({ modelType: 'gemini' }),
      setState: (state) => console.log('[Mock] setState:', state)
  };
}

// Función para renderizar la aplicación con manejo de errores mejorado
function renderApp() {
  const root = document.getElementById("root");
  if (!root) {
    console.error('Elemento root no encontrado');
    return;
  }
  
  try {
    console.log('Renderizando React app');
    ReactDOM.render(
      <VSCodeProvider>
        <Chat />
      </VSCodeProvider>,
      root
    );
    console.log('React app renderizada correctamente');
  } catch (error) {
    console.error('Error al renderizar React app:', error);
    // Fallback para mostrar algo en caso de error
    root.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h2>Error al cargar la UI</h2>
        <pre>${error.message}</pre>
      </div>
    `;
  }
}

// Iniciar la aplicación
renderApp();