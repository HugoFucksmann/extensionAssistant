/**
 * BackendService.js
 * Servicio centralizado para la comunicación con el backend (extensión de VS Code)
 */

export const ACTIONS = {
  SEND_MESSAGE: 'sendMessage',
  SET_MODEL: 'setModel',  // Acción para cambiar el modelo
  LOAD_CHAT: 'loadChat',
  LOAD_HISTORY: 'loadHistory',
  CLEAR_CONVERSATION: 'clearConversation',
  GET_PROJECT_FILES: 'getProjectFiles',
  NEW_CHAT: 'newChat'
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

  send(action, payload = {}) {
    if (!this.vscode) return;
    
    // Usar requestAnimationFrame para evitar bloquear la UI
    requestAnimationFrame(() => {
      this.vscode.postMessage({ type: action, ...payload });
    });
  }

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

  getState() {
    return this.vscode?.getState() || {};
  }

  setState(state) {
    this.vscode?.setState(state);
  }
}

export const createBackendService = vscode => new BackendService(vscode);
