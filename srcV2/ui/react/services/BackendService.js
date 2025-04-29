/**
 * BackendService.js
 * Servicio centralizado para la comunicación directa con el backend
 */

// Acciones disponibles para el frontend
export const ACTIONS = {
  SEND_MESSAGE: 'message:send',
  SET_MODEL: 'model:change',
  LOAD_CHAT: 'chat:load',
  LOAD_HISTORY: 'chat:list:load',
  NEW_CHAT: 'chat:new'
};

class BackendService {
  constructor(vscode) {
    this.vscode = vscode;
    this.listeners = new Map();
    this._setupMessageListener();
  }

  _setupMessageListener() {
    window.addEventListener('message', (event) => {
      const { type, ...data } = event.data || {};
      if (!type) return;
      
      const callbacks = this.listeners.get(type);
      callbacks?.forEach(callback => callback(data));
    });
  }

  // Método para enviar comandos al backend
  send(action, payload = {}) {
    if (!this.vscode) return;
    
    // Usar requestAnimationFrame para evitar bloquear la UI
    requestAnimationFrame(() => {
      this.vscode.postMessage({ command: action, payload });
    });
  }

  // Métodos específicos para acciones directas
  sendMessage(message) {
    this.send(ACTIONS.SEND_MESSAGE, { message });
  }
  
  setModel(modelType) {
    this.send(ACTIONS.SET_MODEL, { modelType });
  }
  
  loadChat(chatId, loadMessages = true) {
    this.send(ACTIONS.LOAD_CHAT, { chatId, loadMessages });
  }
  
  loadHistory() {
    this.send(ACTIONS.LOAD_HISTORY);
  }
  
  createNewChat() {
    this.send(ACTIONS.NEW_CHAT);
  }

  // Métodos para suscripción a eventos
  on(type, callback) {
    const callbacks = this.listeners.get(type) || [];
    this.listeners.set(type, [...callbacks, callback]);
  }

  off(type, callback) {
    const callbacks = this.listeners.get(type);
    if (!callbacks) return;
    
    const filtered = callbacks.filter(cb => cb !== callback);
    if (filtered.length === 0) {
      this.listeners.delete(type);
    } else {
      this.listeners.set(type, filtered);
    }
  }

  // Métodos para estado local del webview
  getState() {
    return this.vscode?.getState() || {};
  }

  setState(state) {
    this.vscode?.setState(state);
  }
}

export const createBackendService = vscode => new BackendService(vscode);