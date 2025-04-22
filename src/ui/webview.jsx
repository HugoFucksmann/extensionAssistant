import React from "react";
import ReactDOM from "react-dom";
import Header from "./Components/Header";
import ChatInput from "./Components/InputChat/ChatInput";
import ChatHistory from "./historical/ChatHistory";
import RecentChats from "./historical/RecentChats";
import { AppProvider } from "./context/AppContext";
import ChatMessages from "./Components/ChatMessages/ChatMessages";

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

// Inicializar vscode una sola vez con manejo de errores mejorado
let vscode;
try {
  console.log('Intentando adquirir vscode API');
  vscode = acquireVsCodeApi();
  console.log('vscode API adquirida correctamente');
} catch (error) {
  console.error('Error al adquirir vscode API:', error);
  // Proporcionar un mock para entornos de desarrollo/prueba
  vscode = {
    postMessage: (msg) => console.log('Mock postMessage:', msg),
    getState: () => ({}),
    setState: (state) => console.log('Mock setState:', state)
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
      <AppProvider vscode={vscode}>
        <Chat />
      </AppProvider>,
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
